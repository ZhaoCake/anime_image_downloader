import { open, save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { dirname, join, pictureDir } from "@tauri-apps/api/path";
import { open as openPath } from "@tauri-apps/plugin-shell";

let currentImages = [];
let currentImageIndex = 0;
let lastSavedPath = null;
let currentZoomLevel = 100;
let currentRotation = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isFitMode = true;
let selectedImages = new Set();
let isDarkMode = false;

const apiBase = "https://cnmiw.com/api.php";

document.addEventListener("DOMContentLoaded", () => {
  const imageTypeSelect = document.getElementById("image-type");
  const imageCountInput = document.getElementById("image-count");
  const saveFormatSelect = document.getElementById("save-format");
  const fetchButton = document.getElementById("fetch-button");
  const saveButton = document.getElementById("save-button");
  const copyButton = document.getElementById("copy-button");
  const openFolderButton = document.getElementById("open-folder-button");
  const defaultPathCheckbox = document.getElementById("default-path");
  const imageDisplay = document.getElementById("image-display");
  const thumbnailsContainer = document.getElementById("thumbnails-container");
  const imageInfoContent = document.getElementById("image-info-content");
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  const batchSaveButton = document.getElementById("batch-save-button");
  const navHintLeft = document.getElementById("nav-hint-left");
  const navHintRight = document.getElementById("nav-hint-right");
  const imageStatus = document.getElementById("image-status");
  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const zoomResetBtn = document.getElementById("zoom-reset-btn");
  const zoomFitBtn = document.getElementById("zoom-fit-btn");
  const zoomLevelDisplay = document.getElementById("zoom-level");
  const rotateLeftBtn = document.getElementById("rotate-left-btn");
  const rotateRightBtn = document.getElementById("rotate-right-btn");
  const themeToggle = document.getElementById("theme-toggle");

  initializeTheme();
  loadImageCategories();

  fetchButton.addEventListener("click", fetchImages);
  saveButton.addEventListener("click", saveCurrentImage);
  copyButton.addEventListener("click", copyImageToClipboard);
  openFolderButton.addEventListener("click", openImageFolder);
  selectAllCheckbox.addEventListener("change", toggleSelectAll);
  batchSaveButton.addEventListener("click", batchSaveSelectedImages);
  zoomInBtn.addEventListener("click", () => changeZoom(10));
  zoomOutBtn.addEventListener("click", () => changeZoom(-10));
  zoomResetBtn.addEventListener("click", resetZoom);
  zoomFitBtn.addEventListener("click", toggleFitMode);
  rotateLeftBtn.addEventListener("click", () => rotate(-90));
  rotateRightBtn.addEventListener("click", () => rotate(90));
  document.addEventListener("keydown", handleKeyDown);
  imageDisplay.addEventListener("mousedown", startDrag);
  imageDisplay.addEventListener("mousemove", drag);
  imageDisplay.addEventListener("mouseup", endDrag);
  imageDisplay.addEventListener("mouseleave", endDrag);
  imageDisplay.addEventListener("wheel", handleWheel, { passive: false });
  imageDisplay.addEventListener("mousemove", showNavigationHints);
  imageDisplay.addEventListener("mouseleave", hideNavigationHints);
  navHintLeft.addEventListener("click", navigateToPrevious);
  navHintRight.addEventListener("click", navigateToNext);
  themeToggle.addEventListener("click", toggleDarkMode);

  function initializeTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme");
      isDarkMode = true;
    } else {
      document.body.classList.remove("dark-theme");
      isDarkMode = false;
    }

    if (!savedTheme) {
      const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
      if (prefersDarkScheme.matches) {
        document.body.classList.add("dark-theme");
        isDarkMode = true;
        localStorage.setItem("theme", "dark");
      }
    }
  }

  function toggleDarkMode() {
    isDarkMode = !isDarkMode;

    if (isDarkMode) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }

    themeToggle.classList.add("rotate");
    setTimeout(() => {
      themeToggle.classList.remove("rotate");
    }, 300);
  }

  async function loadImageCategories() {
    try {
      const response = await fetch(`${apiBase}?type=json`);
      const data = await response.json();
      if (data && data.sort_list && Array.isArray(data.sort_list)) {
        while (imageTypeSelect.firstChild) {
          imageTypeSelect.removeChild(imageTypeSelect.firstChild);
        }

        data.sort_list.forEach((category) => {
          const option = document.createElement("option");
          option.value = category.enname || category.name;
          option.textContent = category.name || category.enname;
          imageTypeSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error("Error loading image categories:", error);
    }
  }

  async function fetchImages() {
    const imageType = imageTypeSelect.value;
    const count = parseInt(imageCountInput.value, 10) || 1;

    fetchButton.disabled = true;
    fetchButton.textContent = "加载中...";
    imageDisplay.innerHTML = '<div class="loading-spinner"></div>';
    thumbnailsContainer.innerHTML = "";
    imageInfoContent.innerHTML = "<p>加载图像中...</p>";

    resetViewState();
    disableImageControls();

    try {
      const requestCount = Math.min(Math.max(count, 1), 10);
      const url = `${apiBase}?sort=${encodeURIComponent(imageType)}&type=json&num=${requestCount}`;
      const response = await fetch(url);
      const data = await response.json();

      let imageUrls = [];
      if (Array.isArray(data.pic)) {
        imageUrls = data.pic;
      } else if (typeof data.pic === "string") {
        imageUrls = [data.pic];
      }

      if (imageUrls.length === 0) {
        throw new Error("获取图像失败，返回格式错误");
      }

      const imagePromises = imageUrls.map((url) => fetchImageData(url));
      const results = await Promise.all(imagePromises);
      const images = results.filter((result) => result !== null);

      if (images.length === 0) {
        throw new Error("所有图像获取失败");
      }

      currentImages = images;
      currentImageIndex = 0;
      displayImage(currentImageIndex);
      createThumbnails(currentImages);
      selectedImages.clear();
      selectAllCheckbox.checked = false;
      updateBatchSaveButton();
      enableImageControls();
    } catch (error) {
      console.error("Error fetching images:", error);
      imageDisplay.innerHTML = `<p>抓取图像出错: ${error.message}</p>`;
      imageInfoContent.innerHTML = "<p>无法获取图像信息</p>";
      disableImageControls();
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = "抓取图像";
    }
  }

  function enableImageControls() {
    saveButton.disabled = false;
    copyButton.disabled = false;
    zoomInBtn.disabled = false;
    zoomOutBtn.disabled = false;
    zoomResetBtn.disabled = false;
    zoomFitBtn.disabled = false;
    rotateLeftBtn.disabled = false;
    rotateRightBtn.disabled = false;
    batchSaveButton.disabled = false;
  }

  function disableImageControls() {
    saveButton.disabled = true;
    copyButton.disabled = true;
    openFolderButton.disabled = true;
    zoomInBtn.disabled = true;
    zoomOutBtn.disabled = true;
    zoomResetBtn.disabled = true;
    zoomFitBtn.disabled = true;
    rotateLeftBtn.disabled = true;
    rotateRightBtn.disabled = true;
    batchSaveButton.disabled = true;
  }

  function resetViewState() {
    currentZoomLevel = 100;
    currentRotation = 0;
    isDragging = false;
    dragOffsetX = 0;
    dragOffsetY = 0;
    isFitMode = true;
    updateZoomDisplay();
  }

  function displayImage(index) {
    if (!currentImages || !currentImages[index]) {
      return;
    }

    const imageData = currentImages[index].data;
    const imageInfo = currentImages[index].info;
    const mimeType = formatToMime(imageInfo?.format);

    resetViewState();
    imageDisplay.innerHTML = "";
    imageDisplay.classList.add("fit-mode");

    try {
      const img = new Image();
      img.onerror = function () {
        imageDisplay.innerHTML = "<p>图像加载失败</p>";
      };
      img.src = `data:${mimeType};base64,${imageData}`;
      img.onload = () => {
        imageDisplay.appendChild(img);
        updateThumbnailSelection(index);
        displayImageInfo(imageInfo, currentImages[index].url, currentImages[index].filename);
        applyImageTransform();
        updateImageStatus();
      };
    } catch (error) {
      console.error("Error displaying image:", error);
      imageDisplay.innerHTML = "<p>图像显示错误</p>";
    }
  }

  function updateImageStatus() {
    if (currentImages.length === 0) {
      imageStatus.style.display = "none";
      return;
    }

    const selectedCount = selectedImages.size;
    const isCurrentSelected = selectedImages.has(currentImageIndex);
    const statusText = `${currentImageIndex + 1} / ${currentImages.length}` +
      (selectedCount > 0 ? ` (已选择 ${selectedCount} 张)` : "");

    imageStatus.textContent = statusText;
    imageStatus.style.display = "block";
    imageStatus.style.backgroundColor = isCurrentSelected
      ? "rgba(66, 133, 244, 0.7)"
      : "rgba(0, 0, 0, 0.5)";
  }

  function displayImageInfo(info, url, filename) {
    if (!info) {
      imageInfoContent.innerHTML = "<p>无法获取图像信息</p>";
      return;
    }

    const urlParts = url.split("/");
    const originalFilename = urlParts[urlParts.length - 1].split("?")[0];

    const html = `
      <table>
        <tr><td>尺寸:</td><td>${info.width || 0} × ${info.height || 0} px</td></tr>
        <tr><td>大小:</td><td>${info.size || 0} KB</td></tr>
        <tr><td>格式:</td><td>${(info.format || "unknown").toUpperCase()}</td></tr>
        <tr><td>宽高比:</td><td>${info.aspectRatio || "0"}</td></tr>
        <tr><td>标准文件名:</td><td title="${filename || ""}" style="word-break: break-all; overflow: hidden; text-overflow: ellipsis;">${filename || originalFilename || ""}</td></tr>
      </table>
    `;

    imageInfoContent.innerHTML = html;
  }

  function createThumbnails(images) {
    thumbnailsContainer.innerHTML = "";

    images.forEach((image, index) => {
      const thumbnail = document.createElement("div");
      thumbnail.className = "thumbnail";
      if (index === currentImageIndex) {
        thumbnail.classList.add("active");
      }

      const img = new Image();
      const thumbMime = formatToMime(image.info?.format);
      img.src = `data:${thumbMime};base64,${image.data}`;
      thumbnail.appendChild(img);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "thumbnail-checkbox";
      checkbox.checked = selectedImages.has(index);
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        if (checkbox.checked) {
          selectedImages.add(index);
        } else {
          selectedImages.delete(index);
        }
        updateSelectAllCheckbox();
        updateBatchSaveButton();
        updateImageStatus();
      });
      thumbnail.appendChild(checkbox);

      thumbnail.addEventListener("click", (e) => {
        if (e.target !== checkbox) {
          currentImageIndex = index;
          displayImage(index);
        }
      });

      thumbnailsContainer.appendChild(thumbnail);
    });

    updateSelectAllCheckbox();
    updateBatchSaveButton();
  }

  function updateSelectAllCheckbox() {
    if (currentImages.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = true;
      return;
    }

    selectAllCheckbox.disabled = false;
    selectAllCheckbox.checked = selectedImages.size === currentImages.length;
  }

  function toggleSelectAll() {
    if (selectAllCheckbox.checked) {
      for (let i = 0; i < currentImages.length; i++) {
        selectedImages.add(i);
      }
    } else {
      selectedImages.clear();
    }

    const checkboxes = thumbnailsContainer.querySelectorAll(".thumbnail-checkbox");
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = selectedImages.has(index);
    });

    updateBatchSaveButton();
    updateImageStatus();
  }

  function updateBatchSaveButton() {
    batchSaveButton.disabled = selectedImages.size === 0;
  }

  async function batchSaveSelectedImages() {
    if (selectedImages.size === 0) return;

    const saveFormat = saveFormatSelect.value;
    const useDefaultPath = defaultPathCheckbox.checked;

    let saveDir = null;
    if (!useDefaultPath) {
      try {
        const result = await open({
          title: "选择保存目录",
          directory: true,
          multiple: false,
          defaultPath: await pictureDir()
        });

        if (!result) return;
        saveDir = result;
      } catch (error) {
        console.error("Error selecting directory:", error);
        alert("选择文件夹失败");
        return;
      }
    }

    const progressWindow = document.createElement("div");
    progressWindow.className = "progress-window";
    progressWindow.innerHTML = `
      <div class="progress-content">
        <h3>正在保存图像</h3>
        <div class="progress-bar-container">
          <div class="progress-bar" id="save-progress-bar"></div>
        </div>
        <div class="progress-text" id="save-progress-text">0/${selectedImages.size}</div>
      </div>
    `;
    document.body.appendChild(progressWindow);

    const progressBar = document.getElementById("save-progress-bar");
    const progressText = document.getElementById("save-progress-text");

    let successCount = 0;
    let failCount = 0;

    for (const index of selectedImages) {
      try {
        const imageData = currentImages[index].data;
        let filename = currentImages[index].filename;

        if (saveFormat !== "original") {
          const baseFilename = filename.substring(0, filename.lastIndexOf("."));
          filename = `${baseFilename}.${saveFormat}`;
        }

        const targetDir = saveDir || await pictureDir();
        const targetPath = await join(targetDir, filename);
        await writeFile(targetPath, base64ToUint8Array(imageData));

        successCount++;
        lastSavedPath = targetPath;
      } catch (error) {
        console.error("Error saving image:", error);
        failCount++;
      }

      const progress = ((successCount + failCount) / selectedImages.size) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${successCount + failCount}/${selectedImages.size}`;
    }

    document.body.removeChild(progressWindow);

    if (successCount > 0) {
      openFolderButton.disabled = false;
      alert(`保存完成!\n成功: ${successCount} 张\n失败: ${failCount} 张`);
    } else {
      alert("保存失败，没有图像被保存");
    }
  }

  function updateThumbnailSelection(selectedIndex) {
    const thumbnails = thumbnailsContainer.querySelectorAll(".thumbnail");
    thumbnails.forEach((thumb, index) => {
      if (index === selectedIndex) {
        thumb.classList.add("active");
      } else {
        thumb.classList.remove("active");
      }
    });
  }

  function navigateToPrevious() {
    if (currentImageIndex > 0) {
      currentImageIndex--;
      displayImage(currentImageIndex);
    } else {
      showTemporaryHint("已经是第一张图像");
    }
  }

  function navigateToNext() {
    if (currentImageIndex < currentImages.length - 1) {
      currentImageIndex++;
      displayImage(currentImageIndex);
    } else {
      showTemporaryHint("已经是最后一张图像");
    }
  }

  function showTemporaryHint(message) {
    const hint = document.createElement("div");
    hint.className = "nav-hint top show";
    hint.textContent = message;
    document.getElementById("image-container").appendChild(hint);

    setTimeout(() => {
      hint.classList.remove("show");
      setTimeout(() => {
        hint.remove();
      }, 300);
    }, 1500);
  }

  function showNavigationHints(e) {
    if (currentImages.length <= 1) return;

    const containerRect = imageDisplay.getBoundingClientRect();
    const threshold = 100;

    if (e.clientX - containerRect.left < threshold && currentImageIndex > 0) {
      navHintLeft.classList.add("show");
    } else {
      navHintLeft.classList.remove("show");
    }

    if (containerRect.right - e.clientX < threshold && currentImageIndex < currentImages.length - 1) {
      navHintRight.classList.add("show");
    } else {
      navHintRight.classList.remove("show");
    }
  }

  function hideNavigationHints() {
    navHintLeft.classList.remove("show");
    navHintRight.classList.remove("show");
  }

  async function saveCurrentImage() {
    if (!currentImages || !currentImages[currentImageIndex]) return;

    const imageData = currentImages[currentImageIndex].data;
    const useDefaultPath = defaultPathCheckbox.checked;
    const saveFormat = saveFormatSelect.value;

    let filename = currentImages[currentImageIndex].filename;
    if (saveFormat !== "original") {
      const baseFilename = filename.substring(0, filename.lastIndexOf("."));
      filename = `${baseFilename}.${saveFormat}`;
    }

    try {
      let targetPath = null;
      if (useDefaultPath) {
        const pictures = await pictureDir();
        targetPath = await join(pictures, filename);
      } else {
        targetPath = await save({
          title: "保存图像",
          defaultPath: await join(await pictureDir(), filename),
          filters: [{ name: "Images", extensions: ["jpg", "png"] }]
        });
      }

      if (!targetPath) {
        return;
      }

      await writeFile(targetPath, base64ToUint8Array(imageData));
      alert("图像保存成功！");
      lastSavedPath = targetPath;
      openFolderButton.disabled = false;
    } catch (error) {
      console.error("Error saving image:", error);
      alert(`保存失败: ${error.message}`);
    }
  }

  async function copyImageToClipboard() {
    if (!currentImages || !currentImages[currentImageIndex]) return;

    const imageData = currentImages[currentImageIndex].data;
    const format = currentImages[currentImageIndex].info?.format || "jpeg";
    const mimeType = formatToMime(format);

    try {
      const blob = base64ToBlob(imageData, mimeType);
      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: blob })
      ]);
      alert("图像已复制到剪贴板");
    } catch (error) {
      console.error("Error copying image to clipboard:", error);
      alert(`复制失败: ${error.message}`);
    }
  }

  async function openImageFolder() {
    if (!lastSavedPath) {
      alert("请先保存图片");
      return;
    }

    try {
      const folderPath = await dirname(lastSavedPath);
      await openPath(folderPath);
    } catch (error) {
      console.error("Error opening folder:", error);
      alert("打开文件夹时出错");
    }
  }

  function changeZoom(delta) {
    if (isFitMode) {
      toggleFitMode();
    }

    const newZoom = Math.max(10, Math.min(500, currentZoomLevel + delta));
    if (newZoom !== currentZoomLevel) {
      currentZoomLevel = newZoom;
      applyImageTransform();
      updateZoomDisplay();
    }
  }

  function updateZoomDisplay() {
    zoomLevelDisplay.textContent = `${currentZoomLevel}%`;
  }

  function resetZoom() {
    isFitMode = false;
    imageDisplay.classList.remove("fit-mode");
    currentZoomLevel = 100;
    dragOffsetX = 0;
    dragOffsetY = 0;
    applyImageTransform();
    updateZoomDisplay();
  }

  function toggleFitMode() {
    isFitMode = !isFitMode;
    if (isFitMode) {
      imageDisplay.classList.add("fit-mode");
      dragOffsetX = 0;
      dragOffsetY = 0;
    } else {
      imageDisplay.classList.remove("fit-mode");
      currentZoomLevel = 100;
      updateZoomDisplay();
    }
    applyImageTransform();
  }

  function rotate(degrees) {
    currentRotation = (currentRotation + degrees) % 360;
    applyImageTransform();
  }

  function applyImageTransform() {
    const img = imageDisplay.querySelector("img");
    if (!img) return;

    if (isFitMode) {
      img.style.transform = `rotate(${currentRotation}deg)`;
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      img.style.transformOrigin = "center center";
    } else {
      img.style.transform = `rotate(${currentRotation}deg) scale(${currentZoomLevel / 100}) translate(${dragOffsetX}px, ${dragOffsetY}px)`;
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.transformOrigin = "center center";
    }

    if (!isFitMode && currentZoomLevel > 100) {
      imageDisplay.classList.add("can-scroll");
    } else {
      imageDisplay.classList.remove("can-scroll");
    }
  }

  function startDrag(e) {
    if (isFitMode || currentZoomLevel <= 100) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    e.preventDefault();
  }

  function drag(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    dragOffsetX += deltaX / (currentZoomLevel / 100);
    dragOffsetY += deltaY / (currentZoomLevel / 100);

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    applyImageTransform();
    e.preventDefault();
  }

  function endDrag() {
    isDragging = false;
  }

  function handleWheel(e) {
    if (e.ctrlKey) {
      e.preventDefault();
      changeZoom(e.deltaY > 0 ? -10 : 10);
    }
  }

  function handleKeyDown(e) {
    if (currentImages.length === 0) return;

    switch (e.key) {
      case "+":
      case "=":
        if (e.ctrlKey) {
          e.preventDefault();
          changeZoom(10);
        }
        break;
      case "-":
      case "_":
        if (e.ctrlKey) {
          e.preventDefault();
          changeZoom(-10);
        }
        break;
      case "0":
        if (e.ctrlKey) {
          e.preventDefault();
          resetZoom();
        }
        break;
      case "f":
        e.preventDefault();
        toggleFitMode();
        break;
      case "r":
        e.preventDefault();
        rotate(90);
        break;
      case "l":
        e.preventDefault();
        rotate(-90);
        break;
      case "ArrowLeft":
        e.preventDefault();
        navigateToPrevious();
        break;
      case "ArrowRight":
        e.preventDefault();
        navigateToNext();
        break;
      case "s":
        if (e.ctrlKey) {
          e.preventDefault();
          saveCurrentImage();
        }
        break;
      case "c":
        if (e.ctrlKey) {
          e.preventDefault();
          copyImageToClipboard();
        }
        break;
      case "a":
        if (e.ctrlKey) {
          e.preventDefault();
          selectAllCheckbox.checked = !selectAllCheckbox.checked;
          toggleSelectAll();
        }
        break;
      default:
        break;
    }
  }
});

async function fetchImageData(url) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const info = await getImageInfo(buffer, url, response.headers.get("content-type"));

    return {
      url,
      data: base64,
      info,
      filename: generateFilename(url, info)
    };
  } catch (error) {
    console.error("Error fetching image content:", error);
    return null;
  }
}

async function getImageInfo(buffer, url, contentType) {
  const blob = new Blob([buffer], { type: contentType || "image/jpeg" });
  const sizeInBytes = blob.size;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);
  const format = resolveFormat(contentType, url);
  const dimensions = await getImageDimensions(blob);
  const aspectRatio = dimensions.width && dimensions.height
    ? (dimensions.width / dimensions.height).toFixed(3)
    : "0";

  return {
    width: dimensions.width || 0,
    height: dimensions.height || 0,
    format,
    size: sizeInKB,
    sizeBytes: sizeInBytes,
    aspectRatio
  };
}

function resolveFormat(contentType, url) {
  if (contentType && contentType.includes("/")) {
    return contentType.split(";")[0].split("/")[1];
  }

  const cleanUrl = url.split("?")[0];
  const extension = cleanUrl.split(".").pop();
  return extension || "unknown";
}

function getImageDimensions(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  });
}

function generateFilename(url, imageInfo) {
  try {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, "-").substring(0, 19);

    let originalFilename = "image.jpg";
    if (typeof url === "string") {
      const urlParts = url.split("/");
      const lastPart = urlParts[urlParts.length - 1] || "";
      if (lastPart && !lastPart.startsWith("?")) {
        originalFilename = lastPart.split("?")[0];
      }
    }

    let dimensionInfo = "";
    if (imageInfo && imageInfo.width && imageInfo.height) {
      dimensionInfo = `_${imageInfo.width}x${imageInfo.height}`;
    }

    return `${timestamp}${dimensionInfo}_${originalFilename}`;
  } catch (error) {
    console.error("Error generating filename:", error);
    const date = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    return `${date}_image.jpg`;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64ToBlob(base64, mimeType) {
  return new Blob([base64ToUint8Array(base64)], { type: mimeType });
}

function formatToMime(format) {
  const normalized = (format || "jpeg").toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "image/jpeg";
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  return "image/jpeg";
}
