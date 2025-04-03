const { ipcRenderer } = require('electron');

// Global variables
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
let selectedImages = new Set(); // 存储选中的图像索引
let isDarkMode = false; // 夜间模式状态

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const imageTypeSelect = document.getElementById('image-type');
  const imageCountInput = document.getElementById('image-count');
  const saveFormatSelect = document.getElementById('save-format');
  const customFilenameInput = document.getElementById('custom-filename');
  const fetchButton = document.getElementById('fetch-button');
  const saveButton = document.getElementById('save-button');
  const copyButton = document.getElementById('copy-button');
  const openFolderButton = document.getElementById('open-folder-button');
  const defaultPathCheckbox = document.getElementById('default-path');
  const imageDisplay = document.getElementById('image-display');
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  const imageInfoContent = document.getElementById('image-info-content');
  
  // 批量选择控件
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const batchSaveButton = document.getElementById('batch-save-button');
  
  // 导航提示元素
  const navHintLeft = document.getElementById('nav-hint-left');
  const navHintRight = document.getElementById('nav-hint-right');
  const imageStatus = document.getElementById('image-status');
  
  // 工具栏按钮
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');
  const zoomFitBtn = document.getElementById('zoom-fit-btn');
  const zoomLevelDisplay = document.getElementById('zoom-level');
  const rotateLeftBtn = document.getElementById('rotate-left-btn');
  const rotateRightBtn = document.getElementById('rotate-right-btn');
  
  // 夜间模式切换按钮
  const themeToggle = document.getElementById('theme-toggle');
  
  // 初始化主题
  initializeTheme();
  
  // 加载图片类型
  loadImageCategories();
  
  // 绑定事件处理器
  fetchButton.addEventListener('click', fetchImages);
  saveButton.addEventListener('click', saveCurrentImage);
  copyButton.addEventListener('click', copyImageToClipboard);
  openFolderButton.addEventListener('click', openImageFolder);
  
  // 批量操作事件
  selectAllCheckbox.addEventListener('change', toggleSelectAll);
  batchSaveButton.addEventListener('click', batchSaveSelectedImages);
  
  // 缩放和旋转控制
  zoomInBtn.addEventListener('click', () => changeZoom(10));
  zoomOutBtn.addEventListener('click', () => changeZoom(-10));
  zoomResetBtn.addEventListener('click', resetZoom);
  zoomFitBtn.addEventListener('click', toggleFitMode);
  rotateLeftBtn.addEventListener('click', () => rotate(-90));
  rotateRightBtn.addEventListener('click', () => rotate(90));
  
  // 键盘快捷键
  document.addEventListener('keydown', handleKeyDown);
  
  // 图像拖动控制
  imageDisplay.addEventListener('mousedown', startDrag);
  imageDisplay.addEventListener('mousemove', drag);
  imageDisplay.addEventListener('mouseup', endDrag);
  imageDisplay.addEventListener('mouseleave', endDrag);
  
  // 鼠标滚轮缩放
  imageDisplay.addEventListener('wheel', handleWheel);
  
  // 导航提示显示
  imageDisplay.addEventListener('mousemove', showNavigationHints);
  imageDisplay.addEventListener('mouseleave', hideNavigationHints);
  
  // 鼠标点击导航
  navHintLeft.addEventListener('click', navigateToPrevious);
  navHintRight.addEventListener('click', navigateToNext);
  
  // 夜间模式切换事件
  themeToggle.addEventListener('click', toggleDarkMode);
  
  // 初始化主题设置
  function initializeTheme() {
    // 从本地存储中读取主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      isDarkMode = true;
    } else {
      document.body.classList.remove('dark-theme');
      isDarkMode = false;
    }
    
    // 检查系统偏好
    if (!savedTheme) {
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
      if (prefersDarkScheme.matches) {
        document.body.classList.add('dark-theme');
        isDarkMode = true;
        localStorage.setItem('theme', 'dark');
      }
    }
  }
  
  // 切换夜间模式
  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
    
    // 添加简单的过渡动画
    themeToggle.classList.add('rotate');
    setTimeout(() => {
      themeToggle.classList.remove('rotate');
    }, 300);
  }
  
  // 异步加载可用的图片类型
  async function loadImageCategories() {
    try {
      const result = await ipcRenderer.invoke('get-image-categories');
      
      if (result.success && result.categories) {
        // 清空当前选项
        while (imageTypeSelect.firstChild) {
          imageTypeSelect.removeChild(imageTypeSelect.firstChild);
        }
        
        // 添加新选项
        result.categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category.enname;
          option.textContent = category.name;
          imageTypeSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading image categories:', error);
    }
  }
  
  // 获取图片
  async function fetchImages() {
    const imageType = imageTypeSelect.value;
    const count = parseInt(imageCountInput.value, 10) || 1;
    
    fetchButton.disabled = true;
    fetchButton.textContent = '加载中...';
    imageDisplay.innerHTML = '<div class="loading-spinner"></div>';
    thumbnailsContainer.innerHTML = '';
    imageInfoContent.innerHTML = '<p>加载图像中...</p>';
    
    // 重置缩放和旋转
    resetViewState();
    disableImageControls();
    
    try {
      console.log(`Fetching ${count} images of type: ${imageType}`);
      const result = await ipcRenderer.invoke('fetch-image', {
        imageType,
        count: Math.min(Math.max(count, 1), 10) // 限制在1-10之间
      });
      
      console.log('Fetch result:', result);
      
      if (result.success && result.images && result.images.length > 0) {
        console.log(`Received ${result.images.length} images`);
        currentImages = result.images;
        currentImageIndex = 0;
        
        // 显示第一张图片
        displayImage(currentImageIndex);
        
        // 创建缩略图
        createThumbnails(currentImages);
        
        // 重置选中状态
        selectedImages.clear();
        selectAllCheckbox.checked = false;
        updateBatchSaveButton();
        
        // 启用操作按钮
        enableImageControls();
      } else {
        imageDisplay.innerHTML = '<p>抓取图像失败: ' + (result.message || '未知错误') + '</p>';
        imageInfoContent.innerHTML = '<p>无法获取图像信息</p>';
        disableImageControls();
        console.error('Failed to fetch images:', result.message);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      imageDisplay.innerHTML = '<p>抓取图像出错: ' + error.message + '</p>';
      imageInfoContent.innerHTML = '<p>无法获取图像信息</p>';
      disableImageControls();
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = '抓取图像';
    }
  }
  
  // 启用图像相关控件
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
  
  // 禁用图像相关控件
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
  
  // 重置视图状态
  function resetViewState() {
    currentZoomLevel = 100;
    currentRotation = 0;
    isDragging = false;
    dragOffsetX = 0;
    dragOffsetY = 0;
    isFitMode = true;
    updateZoomDisplay();
  }
  
  // 显示指定索引的图片
  function displayImage(index) {
    if (!currentImages || !currentImages[index]) {
      console.error('No image data at index', index);
      return;
    }
    
    const imageData = currentImages[index].data;
    const imageInfo = currentImages[index].info;
    
    console.log('Displaying image:', index, 'Info:', imageInfo);
    
    // 重置视图状态
    resetViewState();
    
    // 显示图像
    imageDisplay.innerHTML = '';
    imageDisplay.classList.add('fit-mode');
    
    try {
      const img = new Image();
      
      // 添加错误处理
      img.onerror = function() {
        console.error('Failed to load image');
        imageDisplay.innerHTML = '<p>图像加载失败</p>';
      };
      
      img.src = `data:image/jpeg;base64,${imageData}`;
      
      img.onload = () => {
        console.log('Image loaded successfully');
        imageDisplay.appendChild(img);
        
        // 更新缩略图选中状态
        updateThumbnailSelection(index);
        
        // 显示图像信息
        displayImageInfo(imageInfo, currentImages[index].url, currentImages[index].filename);
        
        // 应用视图设置
        applyImageTransform();
        
        // 更新图像状态显示
        updateImageStatus();
      };
    } catch (error) {
      console.error('Error displaying image:', error);
      imageDisplay.innerHTML = '<p>图像显示错误</p>';
    }
  }
  
  // 更新图像状态指示器
  function updateImageStatus() {
    if (currentImages.length === 0) {
      imageStatus.style.display = 'none';
      return;
    }
    
    const selectedCount = selectedImages.size;
    const isCurrentSelected = selectedImages.has(currentImageIndex);
    const statusText = `${currentImageIndex + 1} / ${currentImages.length}` + 
                      (selectedCount > 0 ? ` (已选择 ${selectedCount} 张)` : '');
    
    imageStatus.textContent = statusText;
    imageStatus.style.display = 'block';
    
    // 添加视觉提示当前图像是否被选中
    if (isCurrentSelected) {
      imageStatus.style.backgroundColor = 'rgba(66, 133, 244, 0.7)';
    } else {
      imageStatus.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    }
  }
  
  // 显示图像信息
  function displayImageInfo(info, url, filename) {
    if (!info) {
      imageInfoContent.innerHTML = '<p>无法获取图像信息</p>';
      return;
    }
    
    // 解析URL获取文件信息
    const urlParts = url.split('/');
    const originalFilename = urlParts[urlParts.length - 1].split('?')[0];
    
    const html = `
      <table>
        <tr><td>尺寸:</td><td>${info.width || 0} × ${info.height || 0} px</td></tr>
        <tr><td>大小:</td><td>${info.size || 0} KB</td></tr>
        <tr><td>格式:</td><td>${(info.format || 'unknown').toUpperCase()}</td></tr>
        <tr><td>宽高比:</td><td>${info.aspectRatio || '0'}</td></tr>
        <tr><td>标准文件名:</td><td title="${filename || ''}" style="word-break: break-all; overflow: hidden; text-overflow: ellipsis;">${filename || originalFilename || ''}</td></tr>
      </table>
    `;
    
    imageInfoContent.innerHTML = html;
  }
  
  // 创建缩略图
  function createThumbnails(images) {
    thumbnailsContainer.innerHTML = '';
    
    images.forEach((image, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'thumbnail';
      if (index === currentImageIndex) {
        thumbnail.classList.add('active');
      }
      
      const img = new Image();
      img.src = `data:image/jpeg;base64,${image.data}`;
      thumbnail.appendChild(img);
      
      // 添加复选框
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'thumbnail-checkbox';
      checkbox.checked = selectedImages.has(index);
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation(); // 防止触发缩略图点击事件
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
      
      thumbnail.addEventListener('click', (e) => {
        if (e.target !== checkbox) { // 避免与复选框点击冲突
          currentImageIndex = index;
          displayImage(index);
        }
      });
      
      thumbnailsContainer.appendChild(thumbnail);
    });
    
    updateSelectAllCheckbox();
    updateBatchSaveButton();
  }
  
  // 更新全选复选框状态
  function updateSelectAllCheckbox() {
    if (currentImages.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = true;
      return;
    }
    
    selectAllCheckbox.disabled = false;
    selectAllCheckbox.checked = selectedImages.size === currentImages.length;
  }
  
  // 全选/取消全选
  function toggleSelectAll() {
    if (selectAllCheckbox.checked) {
      // 全选
      for (let i = 0; i < currentImages.length; i++) {
        selectedImages.add(i);
      }
    } else {
      // 取消全选
      selectedImages.clear();
    }
    
    // 更新所有复选框
    const checkboxes = thumbnailsContainer.querySelectorAll('.thumbnail-checkbox');
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = selectedImages.has(index);
    });
    
    updateBatchSaveButton();
    updateImageStatus();
  }
  
  // 更新批量保存按钮状态
  function updateBatchSaveButton() {
    batchSaveButton.disabled = selectedImages.size === 0;
  }
  
  // 批量保存选中的图像
  async function batchSaveSelectedImages() {
    if (selectedImages.size === 0) return;
    
    const saveFormat = saveFormatSelect.value;
    const useDefaultPath = defaultPathCheckbox.checked;
    
    // 获取保存文件夹
    let saveDir;
    if (!useDefaultPath) {
      try {
        const result = await ipcRenderer.invoke('select-directory', {
          title: '选择保存目录',
          defaultPath: app.getPath('pictures')
        });
        
        if (result.canceled) return;
        saveDir = result.filePath;
      } catch (error) {
        console.error('Error selecting directory:', error);
        alert('选择文件夹失败');
        return;
      }
    }
    
    // 显示保存进度
    const progressWindow = document.createElement('div');
    progressWindow.className = 'progress-window';
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
    
    const progressBar = document.getElementById('save-progress-bar');
    const progressText = document.getElementById('save-progress-text');
    
    let successCount = 0;
    let failCount = 0;
    
    // 保存每张选中的图像
    for (const index of selectedImages) {
      try {
        const imageData = currentImages[index].data;
        let filename = currentImages[index].filename;
        
        // 应用格式设置
        if (saveFormat !== 'original') {
          const baseFilename = filename.substring(0, filename.lastIndexOf('.'));
          filename = `${baseFilename}.${saveFormat}`;
        }
        
        const result = await ipcRenderer.invoke('save-image', {
          imageData,
          useDefaultPath,
          customFilename: filename,
          saveDir // 如果指定了目录则传递
        });
        
        if (result.success) {
          successCount++;
          lastSavedPath = result.path; // 保存最后一个成功的路径
        } else {
          failCount++;
          console.error('Failed to save image:', result.message);
        }
        
        // 更新进度
        const progress = ((successCount + failCount) / selectedImages.size) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${successCount + failCount}/${selectedImages.size}`;
      } catch (error) {
        console.error('Error saving image:', error);
        failCount++;
      }
    }
    
    // 关闭进度窗口
    document.body.removeChild(progressWindow);
    
    // 显示结果
    if (successCount > 0) {
      openFolderButton.disabled = false;
      alert(`保存完成!\n成功: ${successCount} 张\n失败: ${failCount} 张`);
    } else {
      alert('保存失败，没有图像被保存');
    }
  }
  
  // 更新缩略图选中状态
  function updateThumbnailSelection(selectedIndex) {
    const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, index) => {
      if (index === selectedIndex) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  }
  
  // 导航到前一张图像
  function navigateToPrevious() {
    if (currentImageIndex > 0) {
      currentImageIndex--;
      displayImage(currentImageIndex);
    } else {
      showTemporaryHint('已经是第一张图像');
    }
  }
  
  // 导航到后一张图像
  function navigateToNext() {
    if (currentImageIndex < currentImages.length - 1) {
      currentImageIndex++;
      displayImage(currentImageIndex);
    } else {
      showTemporaryHint('已经是最后一张图像');
    }
  }
  
  // 显示临时提示
  function showTemporaryHint(message) {
    const hint = document.createElement('div');
    hint.className = 'nav-hint top show';
    hint.textContent = message;
    document.getElementById('image-container').appendChild(hint);
    
    setTimeout(() => {
      hint.classList.remove('show');
      setTimeout(() => {
        hint.remove();
      }, 300); // 等待淡出动画完成
    }, 1500);
  }
  
  // 显示导航提示
  function showNavigationHints(e) {
    if (currentImages.length <= 1) return; // 只有一张图像或没有图像时不显示
    
    const containerRect = imageDisplay.getBoundingClientRect();
    const threshold = 100; // 鼠标靠近边缘的阈值
    
    // 如果鼠标靠近左侧边缘，显示左侧导航提示
    if (e.clientX - containerRect.left < threshold && currentImageIndex > 0) {
      navHintLeft.classList.add('show');
    } else {
      navHintLeft.classList.remove('show');
    }
    
    // 如果鼠标靠近右侧边缘，显示右侧导航提示
    if (containerRect.right - e.clientX < threshold && currentImageIndex < currentImages.length - 1) {
      navHintRight.classList.add('show');
    } else {
      navHintRight.classList.remove('show');
    }
  }
  
  // 隐藏导航提示
  function hideNavigationHints() {
    navHintLeft.classList.remove('show');
    navHintRight.classList.remove('show');
  }
  
  // 保存当前图片
  async function saveCurrentImage() {
    if (!currentImages || !currentImages[currentImageIndex]) return;
    
    const imageData = currentImages[currentImageIndex].data;
    const useDefaultPath = defaultPathCheckbox.checked;
    const saveFormat = saveFormatSelect.value;
    
    // 获取推荐的文件名
    let filename = currentImages[currentImageIndex].filename;
    
    // 根据选择的保存格式调整文件扩展名
    if (saveFormat !== 'original') {
      const baseFilename = filename.substring(0, filename.lastIndexOf('.'));
      filename = `${baseFilename}.${saveFormat}`;
    }
    
    try {
      const result = await ipcRenderer.invoke('save-image', {
        imageData,
        useDefaultPath,
        customFilename: filename
      });
      
      if (result.success) {
        alert(result.message);
        lastSavedPath = result.path;
        openFolderButton.disabled = false;
      } else {
        alert(`保存失败: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving image:', error);
      alert('保存图像时出错');
    }
  }
  
  // 复制图片到剪贴板
  async function copyImageToClipboard() {
    if (!currentImages || !currentImages[currentImageIndex]) return;
    
    const imageData = currentImages[currentImageIndex].data;
    
    try {
      const result = await ipcRenderer.invoke('copy-image-to-clipboard', imageData);
      
      if (result.success) {
        alert(result.message);
      } else {
        alert(`复制失败: ${result.message}`);
      }
    } catch (error) {
      console.error('Error copying image:', error);
      alert('复制图像时出错');
    }
  }
  
  // 打开图片所在文件夹
  async function openImageFolder() {
    if (!lastSavedPath) {
      alert('请先保存图片');
      return;
    }
    
    try {
      await ipcRenderer.invoke('open-image-folder', lastSavedPath);
    } catch (error) {
      console.error('Error opening folder:', error);
      alert('打开文件夹时出错');
    }
  }
  
  // 缩放图像
  function changeZoom(delta) {
    // 如果在适应窗口模式，先切换到实际大小模式
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
  
  // 更新缩放显示
  function updateZoomDisplay() {
    zoomLevelDisplay.textContent = `${currentZoomLevel}%`;
  }
  
  // 重置缩放
  function resetZoom() {
    isFitMode = false;
    imageDisplay.classList.remove('fit-mode');
    currentZoomLevel = 100;
    dragOffsetX = 0;
    dragOffsetY = 0;
    applyImageTransform();
    updateZoomDisplay();
  }
  
  // 切换适应窗口模式
  function toggleFitMode() {
    isFitMode = !isFitMode;
    if (isFitMode) {
      imageDisplay.classList.add('fit-mode');
      dragOffsetX = 0;
      dragOffsetY = 0;
    } else {
      imageDisplay.classList.remove('fit-mode');
      currentZoomLevel = 100;
      updateZoomDisplay();
    }
    applyImageTransform();
  }
  
  // 旋转图像
  function rotate(degrees) {
    currentRotation = (currentRotation + degrees) % 360;
    applyImageTransform();
  }
  
  // 应用图像变换
  function applyImageTransform() {
    const img = imageDisplay.querySelector('img');
    if (!img) return;
    
    if (isFitMode) {
      img.style.transform = `rotate(${currentRotation}deg)`;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.transformOrigin = 'center center';
    } else {
      img.style.transform = `rotate(${currentRotation}deg) scale(${currentZoomLevel/100}) translate(${dragOffsetX}px, ${dragOffsetY}px)`;
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.style.transformOrigin = 'center center';
    }
    
    // 更新滚动指示
    if (!isFitMode && currentZoomLevel > 100) {
      imageDisplay.classList.add('can-scroll');
    } else {
      imageDisplay.classList.remove('can-scroll');
    }
  }
  
  // 开始拖动
  function startDrag(e) {
    if (isFitMode || currentZoomLevel <= 100) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    e.preventDefault();
  }
  
  // 拖动过程
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
  
  // 结束拖动
  function endDrag() {
    isDragging = false;
  }
  
  // 处理鼠标滚轮缩放
  function handleWheel(e) {
    if (e.ctrlKey) {
      e.preventDefault();
      changeZoom(e.deltaY > 0 ? -10 : 10);
    }
  }
  
  // 键盘快捷键处理
  function handleKeyDown(e) {
    // 仅当有图像加载时处理快捷键
    if (currentImages.length === 0) return;
    
    switch (e.key) {
      case '+':
      case '=':
        if (e.ctrlKey) {
          e.preventDefault();
          changeZoom(10);
        }
        break;
      case '-':
      case '_':
        if (e.ctrlKey) {
          e.preventDefault();
          changeZoom(-10);
        }
        break;
      case '0':
        if (e.ctrlKey) {
          e.preventDefault();
          resetZoom();
        }
        break;
      case 'f':
        e.preventDefault();
        toggleFitMode();
        break;
      case 'r':
        e.preventDefault();
        rotate(90);
        break;
      case 'l':
        e.preventDefault();
        rotate(-90);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateToPrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateToNext();
        break;
      case 's':
        if (e.ctrlKey) {
          e.preventDefault();
          saveCurrentImage();
        }
        break;
      case 'c':
        if (e.ctrlKey) {
          e.preventDefault();
          copyImageToClipboard();
        }
        break;
      case 'a':
        if (e.ctrlKey) {
          e.preventDefault();
          selectAllCheckbox.checked = !selectAllCheckbox.checked;
          toggleSelectAll();
        }
        break;
    }
  }
});
