const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const https = require('https');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,  // 增加默认窗口大小
    height: 700,
    minWidth: 800, // 设置最小窗口尺寸
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/app-icon.png')
  });

  mainWindow.loadFile('index.html');
  
  // Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);

  // Open DevTools in development mode
  if (process.argv.includes('--debug')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 创建安全的axios实例，忽略SSL错误
const secureAxios = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

// 获取图片API类型列表
ipcMain.handle('get-image-categories', async () => {
  try {
    const response = await secureAxios.get('https://api.iw233.cn/api.php?type=json');
    if (response.data && response.data.sort_list) {
      const categories = response.data.sort_list;
      return { success: true, categories };
    } else {
      return { success: false, message: '获取图像类型失败' };
    }
  } catch (error) {
    console.error('Error fetching image categories:', error);
    return { success: false, message: '获取图像类型出错' };
  }
});

// 扩展图片获取功能，支持更多参数
ipcMain.handle('fetch-image', async (event, options) => {
  try {
    const { imageType, count = 1 } = options;
    const url = `https://api.iw233.cn/api.php?sort=${imageType}&type=json&num=${count}`;
    
    console.log('Fetching images from:', url);
    
    const response = await secureAxios.get(url);
    
    console.log('API response:', response.data);
    
    if (!response.data || !response.data.pic) {
      console.error('Invalid response format:', response.data);
      return { success: false, message: '获取图像失败，返回格式错误' };
    }
    
    // 如果只请求一张图片，返回单个图片数据
    if (count === 1) {
      const imageUrl = response.data.pic;
      console.log('Image URL:', imageUrl);
      
      // 直接使用API返回的URL，不做类型检查修改
      try {
        const imageResponse = await secureAxios.get(imageUrl, {
          responseType: 'arraybuffer'
        });
        
        const imageData = Buffer.from(imageResponse.data, 'binary').toString('base64');
        console.log('Image fetched successfully, size:', imageResponse.data.length);
        
        // 获取图像信息
        const imageInfo = await getImageInfo(imageResponse.data);
        
        return { 
          success: true, 
          images: [{ 
            url: imageUrl, 
            data: imageData,
            info: imageInfo,
            filename: generateFilename(imageUrl, imageInfo)
          }]
        };
      } catch (err) {
        console.error('Error fetching image content:', err);
        return { success: false, message: `获取图像内容失败: ${err.message}` };
      }
    } 
    // 如果请求多张图片，返回所有图片数据
    else {
      let imageUrls = [];
      if (Array.isArray(response.data.pic)) {
        imageUrls = response.data.pic;
      } else if (typeof response.data.pic === 'string') {
        imageUrls = [response.data.pic];
      } else {
        console.error('Invalid pic format:', response.data.pic);
        return { success: false, message: '获取图像URL格式错误' };
      }
      
      console.log(`Processing ${imageUrls.length} images`);
      const images = [];
      
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const url = imageUrls[i];
          console.log(`Fetching image ${i+1}/${imageUrls.length}:`, url);
          
          const imageResponse = await secureAxios.get(url, {
            responseType: 'arraybuffer'
          });
          const imageData = Buffer.from(imageResponse.data, 'binary').toString('base64');
          console.log(`Image ${i+1} fetched successfully`);
          
          // 获取图像信息
          const imageInfo = await getImageInfo(imageResponse.data);
          
          images.push({ 
            url, 
            data: imageData,
            info: imageInfo,
            filename: generateFilename(url, imageInfo)
          });
        } catch (err) {
          console.error('Error fetching individual image:', err);
          // Continue with other images
        }
      }
      
      if (images.length === 0) {
        return { success: false, message: '所有图像获取失败' };
      }
      
      return { 
        success: true, 
        images
      };
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    return { success: false, message: `获取图像失败: ${error.message}` };
  }
});

// 获取图像信息 - 优化以处理 sharp 可能不可用的情况
async function getImageInfo(buffer) {
  try {
    const sizeInBytes = buffer.length;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    
    try {
      const sharp = require('sharp');
      const metadata = await sharp(buffer).metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: sizeInKB,
        sizeBytes: sizeInBytes,
        aspectRatio: (metadata.width / metadata.height).toFixed(3)
      };
    } catch (sharpError) {
      console.error('Sharp error, using fallback:', sharpError);
      // 如果 sharp 出错，使用基本信息
      return {
        width: 'Unknown',
        height: 'Unknown',
        format: 'jpg',
        size: sizeInKB,
        sizeBytes: sizeInBytes,
        aspectRatio: 'Unknown'
      };
    }
  } catch (error) {
    console.error('Error getting image info:', error);
    return {
      width: 0,
      height: 0,
      format: 'unknown',
      size: '0',
      sizeBytes: 0,
      aspectRatio: '0'
    };
  }
}

// 生成标准文件名 - 简化逻辑减少出错可能性
function generateFilename(url, imageInfo) {
  try {
    // 添加时间戳前缀
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // 尝试从URL提取文件名
    let originalFilename = 'image.jpg';
    
    if (typeof url === 'string') {
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1] || '';
      
      if (lastPart && !lastPart.startsWith('?')) {
        // 移除查询参数
        originalFilename = lastPart.split('?')[0];
      }
    }
    
    // 添加尺寸信息
    let dimensionInfo = '';
    if (imageInfo && imageInfo.width && imageInfo.height && 
        imageInfo.width !== 'Unknown' && imageInfo.height !== 'Unknown') {
      dimensionInfo = `_${imageInfo.width}x${imageInfo.height}`;
    }
    
    return `${timestamp}${dimensionInfo}_${originalFilename}`;
  } catch (error) {
    console.error('Error generating filename:', error);
    // 默认文件名
    const date = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `${date}_image.jpg`;
  }
}

// 保存图片功能
ipcMain.handle('save-image', async (event, { imageData, useDefaultPath, customFilename, saveDir }) => {
  try {
    const defaultFilename = customFilename || '抓取的图像.jpg';
    let savePath;

    if (useDefaultPath) {
      // 使用默认路径（图片文件夹）
      savePath = path.join(app.getPath('pictures'), defaultFilename);
    } else if (saveDir) {
      // 使用指定的保存目录（批量保存时使用）
      savePath = path.join(saveDir, defaultFilename);
    } else {
      // 弹出保存对话框
      const result = await dialog.showSaveDialog({
        title: '保存图像',
        defaultPath: path.join(app.getPath('pictures'), defaultFilename),
        filters: [{ name: 'Images', extensions: ['jpg', 'png'] }]
      });
      
      if (result.canceled) return { success: false, message: '取消保存' };
      savePath = result.filePath;
    }

    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(savePath, buffer);
    return { success: true, message: '图像保存成功！', path: savePath };
  } catch (error) {
    console.error('Error saving image:', error);
    return { success: false, message: `保存失败: ${error.message}` };
  }
});

// 选择目录
ipcMain.handle('select-directory', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog({
      title: options.title || '选择目录',
      defaultPath: options.defaultPath || app.getPath('pictures'),
      properties: ['openDirectory', 'createDirectory']
    });
    
    return result;
  } catch (error) {
    console.error('Error selecting directory:', error);
    return { canceled: true, error: error.message };
  }
});

// 打开图片所在文件夹
ipcMain.handle('open-image-folder', async (event, folderPath) => {
  try {
    await shell.openPath(path.dirname(folderPath));
    return { success: true };
  } catch (error) {
    console.error('Error opening folder:', error);
    return { success: false, message: error.message };
  }
});

// 复制图片到剪贴板
ipcMain.handle('copy-image-to-clipboard', async (event, imageData) => {
  try {
    const nativeImage = require('electron').nativeImage;
    const image = nativeImage.createFromDataURL(`data:image/jpeg;base64,${imageData}`);
    require('electron').clipboard.writeImage(image);
    return { success: true, message: '图像已复制到剪贴板' };
  } catch (error) {
    console.error('Error copying image to clipboard:', error);
    return { success: false, message: `复制失败: ${error.message}` };
  }
});
