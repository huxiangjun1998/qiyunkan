class VideoPlayer {
    constructor() {
        // 默认头像SVG
        this.defaultAvatar = `data:image/svg+xml;base64,${btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128">
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#ff6b6b"/>
                        <stop offset="100%" style="stop-color:#4ecdc4"/>
                    </linearGradient>
                </defs>
                <circle cx="12" cy="8" r="5" fill="url(#gradient)"/>
                <path d="M21,19c0-4.97-4.03-9-9-9s-9,4.03-9,9" stroke="url(#gradient)" fill="none" stroke-width="2"/>
            </svg>
        `)}`;

        this.container = document.querySelector('.video-container');
        this.currentIndex = 0;
        this.videos = [];
        this.isScrolling = false;
        this.touchStartY = 0;
        this.preloadCount = 3;
        this.videoApiUrl = 'https://api.lolimi.cn/API/xjj/xjj.php';
        this.isMuted = false;
        this.volume = 1;
        this.isLoading = false;
        this.minVideosToKeep = 20;
        this.maxRetries = 3;
        this.loadingQueue = [];
        this.maxConcurrentLoads = 2;
        this.retryDelay = 500;
        
        this.baseUrl = 'http://localhost:3000/api';
        this.currentVideoId = null;
        this.isFirstClick = true;
        
        // 添加一个标志来跟踪是否是首次加载
        this.isFirstLoad = true;
        
        // 从localStorage读取声音偏好
        this.hasUserEnabledSound = localStorage.getItem('hasUserEnabledSound') === 'true';
        this.isFirstClick = !this.hasUserEnabledSound;
        
        // 修改默认模式为手动
        this.playMode = 'manual';
        this.lastClickTime = 0;
        this.doubleClickDelay = 300;
        
        // 添加长按菜单状态
        this.longPressTimer = null;
        this.longPressDuration = 500; // 长按触发时间（毫秒）
        this.isMenuVisible = false;
        
        // 修改开发者模式配置
        this.isDeveloperMode = localStorage.getItem('isDeveloperMode') === 'true';
        this.developerPassword = 'owo258369*';
        
        // 如果不是开发者模式，初始化保护
        if (!this.isDeveloperMode) {
            this.initDebugProtection();
            this.initVideoProtection();
        }

        // 修改开发者模式快捷键为 Ctrl + Z
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault(); // 阻止默认的撤销操作
                this.toggleDeveloperMode();
            }
        });

        // 检查是否从点赞列表跳转回来
        const playVideo = sessionStorage.getItem('playVideo');
        if (playVideo) {
            // 将要播放的视频URL添加到视频列表的开头
            this.videos.unshift(playVideo);
            // 清除sessionStorage
            sessionStorage.removeItem('playVideo');
            sessionStorage.removeItem('returnToProfile');
        }
        
        this.init();

        // 添加所有样式
        const style = document.createElement('style');
        style.textContent = `
            .bell-button {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.6);
                border-radius: 50%;
                width: 80px;
                height: 80px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 10px;
                transition: all 0.3s ease;
                z-index: 10;
            }
            
            .bell-button:hover {
                background: rgba(0, 0, 0, 0.8);
                transform: translate(-50%, -50%) scale(1.1);
            }
            
            .bell-text {
                color: white;
                font-size: 12px;
                margin-top: 5px;
                text-align: center;
            }
            
            @keyframes ring {
                0% { transform: rotate(0); }
                10% { transform: rotate(15deg); }
                20% { transform: rotate(-15deg); }
                30% { transform: rotate(10deg); }
                40% { transform: rotate(-10deg); }
                50% { transform: rotate(5deg); }
                60% { transform: rotate(-5deg); }
                70% { transform: rotate(0); }
                100% { transform: rotate(0); }
            }
            
            .bell-button:hover svg {
                animation: ring 1s ease;
            }

            #nextButton {
                transition: background-color 0.3s ease;
                position: relative;
            }
            
            #nextButton::after {
                content: '双击切换自动/手动播放模式';
                position: absolute;
                bottom: 120%;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            #nextButton:hover::after {
                opacity: 1;
                visibility: visible;
            }
            
            #nextButton[data-mode="auto"] {
                background-color: #4CAF50 !important;
            }
            
            #nextButton[data-mode="manual"] {
                background-color: #333 !important;
            }

            .context-menu {
                position: fixed;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 12px;
                padding: 16px;
                z-index: 1000;
                display: none;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .context-menu.visible {
                display: block;
                animation: menuFadeIn 0.2s ease;
            }

            @keyframes menuFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .menu-item {
                display: flex;
                align-items: center;
                padding: 12px;
                color: white;
                font-size: 14px;
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .menu-item:last-child {
                margin-bottom: 0;
            }

            .menu-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .menu-item .toggle-switch {
                margin-left: auto;
                width: 40px;
                height: 20px;
                background: #666;
                border-radius: 10px;
                position: relative;
                transition: background 0.3s ease;
            }

            .menu-item .toggle-switch.active {
                background: #4CAF50;
            }

            .menu-item .toggle-switch::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                background: white;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: transform 0.3s ease;
            }

            .menu-item .toggle-switch.active::after {
                transform: translateX(20px);
            }

            .mobile-next-tip {
                position: fixed;
                bottom: 120px;
                left: 50%;
                transform: translate(-50%, 0);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 2000;
                text-align: center;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: all 0.3s ease;
            }

            .mobile-next-tip.show {
                opacity: 1;
                visibility: visible;
                animation: tipFadeIn 0.3s ease forwards;
            }

            .mobile-next-tip.hide {
                animation: tipFadeOut 0.3s ease forwards;
            }

            @keyframes tipFadeIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, 20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }

            @keyframes tipFadeOut {
                from {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -20px);
                }
            }
        `;
        document.head.appendChild(style);

        // 添加移动端提示状态
        this.hasShownMobileNextTip = false;

        // 初始化 AI 对话框
        this.initAIChat();

        // 添加音量控制相关变量
        this.originalVolume = 1;
        this.isAdjustingVolume = false;
        this.volumeTransitionDuration = 1000; // 音量渐变持续时间（毫秒）
        
        // 添加音量渐变方法
        const fadeVolume = (video, targetVolume, duration) => {
            if (!video || video.muted) return;
            
            const startVolume = video.volume;
            const startTime = performance.now();
            
            const updateVolume = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 使用 easeInOutQuad 缓动函数使音量变化更自然
                const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                
                video.volume = startVolume + (targetVolume - startVolume) * easeInOutQuad(progress);
                
                if (progress < 1) {
                    requestAnimationFrame(updateVolume);
                }
            };
            
            requestAnimationFrame(updateVolume);
        };

        // 在输入框获得焦点时降低音量
        chatInput.addEventListener('focus', () => {
            const video = this.container.querySelector('video');
            if (video && !video.muted && !this.isAdjustingVolume) {
                this.isAdjustingVolume = true;
                this.originalVolume = video.volume;
                fadeVolume(video, 0.2, this.volumeTransitionDuration);
            }
        });

        // 在输入框失去焦点时恢复音量
        chatInput.addEventListener('blur', () => {
            const video = this.container.querySelector('video');
            if (video && !video.muted && this.isAdjustingVolume) {
                fadeVolume(video, this.originalVolume, this.volumeTransitionDuration);
                this.isAdjustingVolume = false;
            }
        });

        // 在AI开始回复时降低音量
        const adjustVolumeForAIResponse = (isResponding) => {
            const video = this.container.querySelector('video');
            if (video && !video.muted) {
                if (isResponding && !this.isAdjustingVolume) {
                    this.isAdjustingVolume = true;
                    this.originalVolume = video.volume;
                    fadeVolume(video, 0.2, this.volumeTransitionDuration);
                } else if (!isResponding && this.isAdjustingVolume) {
                    fadeVolume(video, this.originalVolume, this.volumeTransitionDuration);
                    this.isAdjustingVolume = false;
                }
            }
        };

        // 修改发送消息方法，添加音量控制
        const sendMessage = async () => {
            const message = chatInput.value.trim();
            if (message) {
                // 添加用户消息到UI
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message user';
                messageDiv.textContent = message;
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // 保存用户消息到历史记录
                this.chatHistory.push({
                    type: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                });
                
                // 清空输入框
                chatInput.value = '';
                
                // 显示正在输入动画并降低视频音量
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = '<span></span><span></span><span></span>';
                messagesContainer.appendChild(typingIndicator);
                
                adjustVolumeForAIResponse(true);
                
                try {
                    await sendToDeepSeek(message);
                } finally {
                    adjustVolumeForAIResponse(false);
                }
            }
        };

        // 配置信息
        this.config = {
            development: {
                apiKey: 'sk-97530aa4de0946ee822ed98b83293ec9',
                apiUrl: 'https://api.deepseek.com/v1/chat/completions'
            },
            production: {
                apiKey: 'sk-97530aa4de0946ee822ed98b83293ec9',
                apiUrl: 'https://api.deepseek.com/v1/chat/completions',
                cdnBase: 'https://your-cdn-domain.com' // 替换为你的CDN域名
            }
        };

        // 判断环境
        this.env = window.location.hostname === 'localhost' ? 'development' : 'production';
        
        // 设置API配置
        this.aiApiKey = this.config[this.env].apiKey;
        this.aiApiUrl = this.config[this.env].apiUrl;

        // 初始化其他配置
        this.initializeConfig();
    }

    initializeConfig() {
        // 配置跨域和安全设置
        this.corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };

        // 配置错误重试
        this.maxRetries = 3;
        this.retryDelay = 1000;

        // 配置视频加载
        this.preloadCount = 3;
        this.maxConcurrentLoads = 2;
    }

    // 添加重试机制
    async fetchWithRetry(url, options, retries = this.maxRetries) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.fetchWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }

    async init() {
        this.initEventListeners();
        this.initializeControls();
        
        Promise.all([
            this.loadFirstVideo(),
            this.preloadNextBatch()
        ]);
    }

    async loadFirstVideo() {
        let retryCount = 0;
        const maxRetries = 5;
        
        // 可爱的加载提示词数组
        const loadingMessages = [
            "小姐姐害羞中~马上就来...",
            "等等我嘛~人家在换衣服啦~",
            "马上就好~人家在化妆呢~",
            "别急别急~妹妹在路上啦~",
            "啊~人家在整理头发啦~"
        ];

        while (retryCount < maxRetries) {
            try {
                // 只在第一次重试时显示提示
                if (retryCount === 1) {
                    this.showLoadingToast(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
                }
                
                const video = await this.loadSingleVideo();
                if (video) {
                    this.videos.push(video);
                    this.showCurrentVideo();
                    return true;
                }
            } catch (error) {
                console.log(`首次加载重试 ${retryCount + 1}/${maxRetries}`);
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }

        this.showError('哎呀~小姐姐害羞了，点击刷新再试试吧~');
        return false;
    }

    async preloadNextBatch() {
        const batchSize = 2;
        const loadPromises = Array(batchSize).fill().map(() => 
            this.loadSingleVideo()
                .then(video => {
                    if (video) this.videos.push(video);
                })
                .catch(error => console.error('预加载失败:', error))
        );

        await Promise.allSettled(loadPromises);
        this.startContinuousPreload();
    }

    async loadSingleVideo() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(this.videoApiUrl, {
                signal: controller.signal,
                cache: 'no-store'
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            return new Promise((resolve, reject) => {
                const video = document.createElement('video');
                video.muted = true;
                
                const quickTimeout = setTimeout(() => {
                    video.src = '';
                    reject(new Error('Quick validation timeout'));
                }, 2000);

                video.onloadeddata = () => {
                    clearTimeout(quickTimeout);
                    resolve(url);
                };

                video.onerror = () => {
                    clearTimeout(quickTimeout);
                    reject(new Error('Video validation failed'));
                };

                video.src = url;
            });
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Video load timeout');
            }
            throw error;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1001;
        `;
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
    }

    initEventListeners() {
        if ('ontouchstart' in window) {
            this.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
            this.container.addEventListener('touchmove', this.handleTouchMove.bind(this));
            this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
        } else {
            this.container.addEventListener('wheel', this.handleWheel.bind(this));
        }

        // 添加长按事件处理
        let contextMenu = this.createContextMenu();
        
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
            
            // 开始长按计时
            this.longPressTimer = setTimeout(() => {
                const touch = e.touches[0];
                this.showContextMenu(touch.clientX, touch.clientY);
            }, this.longPressDuration);
        });

        this.container.addEventListener('touchmove', (e) => {
            // 如果移动了就取消长按
            clearTimeout(this.longPressTimer);
        });

        this.container.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
        });

        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (this.isMenuVisible && !contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });
    }

    async loadMoreVideos(count) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            const loadPromises = Array(count).fill().map(() => this.loadSingleVideo());
            const newVideos = await Promise.all(loadPromises);
            this.videos.push(...newVideos);
            console.log(`已加载 ${this.videos.length} 个视频`);
        } catch (error) {
            console.error('加载更多视频失败:', error);
        } finally {
            this.isLoading = false;
        }
    }

    startContinuousPreload() {
        setInterval(() => {
            const remainingVideos = this.videos.length - this.currentIndex;
            if (remainingVideos < 5 && !this.isLoading) {
                this.loadMoreVideos(3).catch(console.error);
            }
        }, 1000);
    }

    createVideoElement(videoUrl) {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        
        const video = document.createElement('video');
        video.className = 'video-player';
        video.src = videoUrl;
        video.controls = false;
        video.playsInline = true;
        video.preload = 'auto';
        video.autoplay = true;
        video.muted = !this.hasUserEnabledSound;
        video.volume = this.volume;
        video.style.width = 'auto';
        video.style.height = '100%';
        video.style.maxWidth = 'calc(100vh * 9 / 16)';
        video.style.margin = '0 auto';
        video.style.display = 'block';
        video.style.objectFit = 'contain';

        // 添加视频保护属性
        video.style.userSelect = 'none';
        video.style.webkitUserSelect = 'none';
        video.style.msUserSelect = 'none';
        video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
        video.disablePictureInPicture = true;
        video.disableRemotePlayback = true;

        // 根据播放模式设置循环属性
        video.loop = this.playMode === 'manual';

        // 创建铃铛按钮，但只在首次加载时显示
        const bellButton = document.createElement('div');
        bellButton.className = 'bell-button';
        bellButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="white">
                <path d="M3,9v6h4l5,5V4L7,9H3z M16.5,12c0-1.77-1-3.29-2.5-4.03V16C15.5,15.29,16.5,13.76,16.5,12z M14,3.23v2.06 c2.89,0.86,5,3.54,5,6.71s-2.11,5.84-5,6.7v2.07c4-0.91,7-4.49,7-8.77C21,7.72,18,4.14,14,3.23z"/>
            </svg>
            <div class="bell-text">点我开声</div>
        `;
        bellButton.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
        `;
        
        const bellText = bellButton.querySelector('.bell-text');
        bellText.style.cssText = `
            color: white;
            font-size: 14px;
            margin-top: 8px;
            font-weight: 500;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            text-align: center;
            white-space: nowrap;
        `;
        
        // 添加铃铛按钮的点击事件
        const handleUnmute = (e) => {
            if (e) e.stopPropagation(); // 阻止事件冒泡到videoCard
            video.muted = false;
            this.isFirstClick = false;
            this.hasUserEnabledSound = true;
            localStorage.setItem('hasUserEnabledSound', 'true');
            bellButton.style.display = 'none';
            this.isFirstLoad = false;  // 标记首次加载已完成
            
            // 在移动端显示下一个按钮的提示
            if (!this.hasShownMobileNextTip && window.innerWidth <= 768) {
                this.showMobileNextTip();
            }
        };
        
        bellButton.addEventListener('click', handleUnmute);

        // 创建暂停提示框
        const pauseIndicator = document.createElement('div');
        pauseIndicator.className = 'pause-indicator';
        pauseIndicator.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M6,19h4V5H6V19z M14,5v14h4V5H14z"/>
            </svg>
        `;

        // 创建一个视频内容区域的点击检测函数
        const isClickInVideoContent = (event) => {
            const rect = video.getBoundingClientRect();
            return (
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom
            );
        };
        
        videoCard.addEventListener('click', (event) => {
            // 只有当点击在视频内容区域时才处理暂停/播放
            if (isClickInVideoContent(event)) {
                if (this.isFirstLoad && video.muted) {
                    handleUnmute();
                    return;
                }
                
                if (video.paused) {
                    video.play();
                    pauseIndicator.classList.remove('show');
                } else {
                    video.pause();
                    pauseIndicator.classList.add('show');
                }
            }
        });
        
        video.addEventListener('volumechange', () => {
            this.isMuted = video.muted;
            this.volume = video.volume;
            // 只在首次加载时显示铃铛
            bellButton.style.display = this.isFirstLoad && video.muted ? 'flex' : 'none';
        });

        video.addEventListener('ended', () => {
            if (this.playMode === 'auto') {
                // 确保视频不会立即重新开始播放
                video.removeAttribute('loop');
                // 添加小延迟以确保事件处理完成
                setTimeout(() => {
                    if (this.playMode === 'auto') {
            this.nextVideo();
                    }
                }, 100);
            } else {
                // 手动模式下，重新播放当前视频
                video.loop = true;
                video.play();
            }
        });

        // 修改视频加载和播放逻辑
        const startPlayback = async () => {
            try {
                await video.play();
            } catch (error) {
                console.log('尝试静音播放');
                video.muted = true;
                try {
                    await video.play();
                } catch (e) {
                    console.log('静音播放也失败，继续尝试');
                    setTimeout(() => video.play(), 100);
                }
            }
            // 只在首次加载时显示铃铛
            bellButton.style.display = this.isFirstLoad && video.muted ? 'flex' : 'none';
        };

        // 确保视频加载后立即开始播放
        if (video.readyState >= 3) {
            startPlayback();
        } else {
            video.addEventListener('canplay', startPlayback, { once: true });
            video.addEventListener('loadeddata', startPlayback, { once: true });
        }

        this.currentVideoId = this.extractVideoId(videoUrl);
        
        videoCard.appendChild(video);
        videoCard.appendChild(pauseIndicator);
        // 只在首次加载时添加铃铛按钮
        if (this.isFirstLoad) {
            videoCard.appendChild(bellButton);
        }
        return videoCard;
    }

    showCurrentVideo() {
        const oldVideo = this.container.querySelector('video');
        if (oldVideo) {
            this.isMuted = oldVideo.muted;
            this.volume = oldVideo.volume;
        }
        
        this.container.innerHTML = '';
        
        if (this.videos[this.currentIndex]) {
            const videoCard = this.createVideoElement(this.videos[this.currentIndex]);
            this.container.appendChild(videoCard);
            
            // 更新下一个按钮状态
            const nextButton = document.querySelector('.next-button');
            if (nextButton) {
                nextButton.setAttribute('data-mode', this.playMode);
            }
            
            // 预加载下一个视频
            if (this.currentIndex < this.videos.length - 1) {
                const nextVideo = document.createElement('video');
                nextVideo.preload = 'auto';
                nextVideo.src = this.videos[this.currentIndex + 1];
            }
        }

        // 清理不需要的视频URL
        this.cleanupOldVideos();
    }

    cleanupOldVideos() {
        // 保留当前视频前后各10个视频
        if (this.videos.length > this.minVideosToKeep) {
            const keepStart = Math.max(0, this.currentIndex - 10);
            const keepEnd = Math.min(this.videos.length, this.currentIndex + 11);
            
            // 释放被删除视频的URL
            this.videos.forEach((url, index) => {
                if (index < keepStart || index >= keepEnd) {
                    URL.revokeObjectURL(url);
                }
            });
            
            this.videos = this.videos.slice(keepStart, keepEnd);
            this.currentIndex = Math.min(10, this.currentIndex);
        }
    }

    async nextVideo() {
        if (this.currentIndex < this.videos.length - 1) {
            const currentCard = this.container.querySelector('.video-card');
            const nextCard = this.createVideoElement(this.videos[this.currentIndex + 1]);
            
            // 优化动画性能
            nextCard.style.willChange = 'transform, opacity';
            currentCard.style.willChange = 'transform, opacity';
            
            // 设置初始状态
            nextCard.classList.add('next');
            this.container.appendChild(nextCard);
            
            // 使用 requestAnimationFrame 确保动画流畅
            requestAnimationFrame(() => {
                // 触发重排
                void nextCard.offsetWidth;
                
                // 添加动画类
                currentCard.classList.add('slide-up');
                nextCard.classList.remove('next');
                nextCard.classList.add('current');
                
                // 动画完成后清理
                const cleanup = () => {
                    currentCard.remove();
                    nextCard.style.willChange = 'auto';
                };
                
                currentCard.addEventListener('animationend', cleanup, { once: true });
            });
            
            this.currentIndex++;
            
            // 预加载下一个视频
            if (this.currentIndex >= this.videos.length - this.preloadCount) {
                this.preloadNextBatch();
            }
        }
    }

    async previousVideo() {
        if (this.currentIndex > 0) {
            const currentCard = this.container.querySelector('.video-card');
            const previousCard = this.createVideoElement(this.videos[this.currentIndex - 1]);
            
            // 设置初始状态
            previousCard.classList.add('previous');
            this.container.appendChild(previousCard);
            
            // 触发重排
            void previousCard.offsetWidth;
            
            // 添加动画类
            currentCard.classList.add('slide-down');
            previousCard.classList.remove('previous');
            previousCard.classList.add('current');
            
            // 等待动画完成
            await new Promise(resolve => {
                currentCard.addEventListener('animationend', () => {
                    currentCard.remove();
                    resolve();
                }, { once: true });
            });
            
            this.currentIndex--;
        }
    }

    handleWheel(e) {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        if (e.deltaY > 0) {
            this.nextVideo();
        } else {
            this.previousVideo();
        }

        setTimeout(() => {
            this.isScrolling = false;
        }, 300);
    }

    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (this.isScrolling) return;
        
        const currentCard = this.container.querySelector('.video-card');
        const touchDeltaY = e.touches[0].clientY - this.touchStartY;
        const progress = Math.abs(touchDeltaY) / window.innerHeight;
        
        if (Math.abs(touchDeltaY) > 20) {
        e.preventDefault(); // 阻止页面滚动
            
            // 计算缩放和透明度
            const scale = 1 - (progress * 0.05);
            const opacity = 1 - progress;
            
            // 应用变换
            currentCard.style.transform = `translateY(${touchDeltaY}px) scale(${scale})`;
            currentCard.style.opacity = opacity;
        }
    }

    handleTouchEnd(e) {
        if (this.isScrolling) return;

        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = this.touchStartY - touchEndY;
        const currentCard = this.container.querySelector('.video-card');

        // 重置卡片样式
        currentCard.style.transform = '';
        currentCard.style.opacity = '';

        if (Math.abs(deltaY) > 50) { // 最小滑动距离
            this.isScrolling = true;
            if (deltaY > 0) {
                this.nextVideo();
            } else {
                this.previousVideo();
            }

            setTimeout(() => {
                this.isScrolling = false;
            }, 300);
        }
    }

    initializeControls() {
        // 静音按钮
        const muteButton = document.getElementById('muteButton');
        const mobileMuteButton = document.getElementById('mobileMuteButton');
        const handleMute = () => {
            const currentVideo = this.container.querySelector('video');
            if (currentVideo) {
                currentVideo.muted = !currentVideo.muted;
                this.isMuted = currentVideo.muted;
                this.updateMuteButtonIcon(muteButton);
                this.updateMuteButtonIcon(mobileMuteButton);
            }
        };
        muteButton.addEventListener('click', handleMute);
        mobileMuteButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleMute();
        });

        // 下一个视频按钮
        const nextButton = document.getElementById('nextButton');
        const mobileNextButton = document.getElementById('mobileNextButton');
        if (nextButton && mobileNextButton) {
            // 设置初始状态为手动模式
            nextButton.setAttribute('data-mode', 'manual');
            mobileNextButton.setAttribute('data-mode', 'manual');
            
            let isDoubleClickPending = false;
            let singleClickTimer = null;
            
            // 更新提示文本
            const updateTooltip = () => {
                const mode = this.playMode === 'manual' ? '自动' : '手动';
                nextButton.setAttribute('data-tooltip', `双击切换为${mode}播放模式`);
                mobileNextButton.setAttribute('data-tooltip', `双击切换为${mode}播放模式`);
            };
            updateTooltip();
            
            const handleNextClick = (e) => {
                if (e) e.preventDefault();
                const currentTime = new Date().getTime();
                
                if (currentTime - this.lastClickTime < this.doubleClickDelay) {
                    // 双击：切换播放模式
                    clearTimeout(singleClickTimer);
                    isDoubleClickPending = false;
                    this.togglePlayMode();
                    updateTooltip(); // 更新提示文本
                } else {
                    // 可能是单击，等待确认不是双击
                    isDoubleClickPending = true;
                    singleClickTimer = setTimeout(() => {
                        if (isDoubleClickPending) {
                            // 确认是单击：播放下一个视频
            this.nextVideo();
                            isDoubleClickPending = false;
                        }
                    }, this.doubleClickDelay);
                }
                this.lastClickTime = currentTime;
            };

            nextButton.addEventListener('click', handleNextClick);
            mobileNextButton.addEventListener('click', handleNextClick);
        }

        // 刷新按钮
        const refreshButton = document.getElementById('refreshButton');
        const mobileRefreshButton = document.getElementById('mobileRefreshButton');
        const handleRefresh = (e) => {
            if (e) e.preventDefault();
            window.location.reload();
        };
        refreshButton.addEventListener('click', handleRefresh);
        mobileRefreshButton.addEventListener('click', handleRefresh);

        // 初始化图标状态
        this.updateMuteButtonIcon(muteButton);
        this.updateMuteButtonIcon(mobileMuteButton);
    }

    updateMuteButtonIcon(button) {
        if (!button) return;
        
        const icon = button.querySelector('svg');
        if (this.isMuted) {
            icon.innerHTML = '<path d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"/>';
        } else {
            icon.innerHTML = '<path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>';
        }
    }

    async refreshVideos() {
        const loading = this.showLoading();
        this.videos = [];
        this.currentIndex = 0;
        this.container.innerHTML = '';
        
        try {
            await this.loadInitialVideo();
        } finally {
            loading.remove();
        }
    }

    showLoading() {
        // 移除可能存在的旧的loading元素
        const oldLoading = this.container.querySelector('.loading');
        if (oldLoading) {
            oldLoading.remove();
        }

        const loading = document.createElement('div');
        loading.className = 'loading';
        
        // 添加加载文字提示
        const loadingText = document.createElement('div');
        loadingText.style.cssText = `
            position: absolute;
            top: calc(50% + 30px);
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 14px;
            text-align: center;
        `;
        loadingText.textContent = '视频加载中...';
        
        this.container.appendChild(loading);
        this.container.appendChild(loadingText);
        
        return {
            remove: () => {
                loading.remove();
                loadingText.remove();
            }
        };
    }

    showToast(message) {
        // 移除可能存在的旧提示
        const oldToast = document.querySelector('.toast-message');
        if (oldToast) {
            oldToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        
        // 设置样式
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 2000;
            text-align: center;
            animation: fadeInOut 2s ease-in-out forwards;
            white-space: nowrap;
        `;

        document.body.appendChild(toast);

        // 2秒后自动移除提示
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // 添加一个新的提示方法，带有可爱的样式
    showLoadingToast(message) {
        // 移除可能存在的旧提示
        const oldToast = document.querySelector('.loading-toast');
        if (oldToast) {
            oldToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'loading-toast';
        toast.textContent = message;
        
        // 设置更简洁的样式
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 16px;
            z-index: 2000;
            text-align: center;
            white-space: nowrap;
            animation: fadeIn 0.3s ease-out;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        `;

        document.body.appendChild(toast);

        // 3秒后自动移除提示
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    isLoggedIn() {
        const token = localStorage.getItem('token');
        const currentUser = localStorage.getItem('currentUser');
        return !!(token && currentUser);
    }

    showLoginPrompt() {
        this.showToast('请先登录后再操作~');
        // 保存当前URL，以便登录后返回
        localStorage.setItem('returnUrl', window.location.href);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`;
        
        return date.toLocaleDateString();
    }

    extractVideoId(url) {
        return url.split('/').pop();
    }

    // 添加切换播放模式的方法
    togglePlayMode() {
        this.playMode = this.playMode === 'manual' ? 'auto' : 'manual';
        localStorage.setItem('playMode', this.playMode);
        
        // 更新按钮样式和提示
        const nextButton = document.getElementById('nextButton');
        const mobileNextButton = document.getElementById('mobileNextButton');
        
        if (nextButton) {
            nextButton.setAttribute('data-mode', this.playMode);
        }
        
        if (mobileNextButton) {
            mobileNextButton.setAttribute('data-mode', this.playMode);
        }
        
        // 更新当前视频的循环状态
        const currentVideo = this.container.querySelector('video');
        if (currentVideo) {
            currentVideo.loop = this.playMode === 'manual';
        }
        
        if (this.playMode === 'auto') {
            this.showToast('已开启自动播放模式');
            // 如果当前视频已经结束，立即播放下一个
            if (currentVideo && currentVideo.ended) {
                this.nextVideo();
            }
        } else {
            this.showToast('已切换到手动播放模式');
        }
    }

    createContextMenu() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        
        // 自动播放开关
        const autoPlayItem = document.createElement('div');
        autoPlayItem.className = 'menu-item';
        autoPlayItem.innerHTML = `
            <span>连续播放</span>
            <div class="toggle-switch ${this.playMode === 'auto' ? 'active' : ''}"></div>
        `;
        autoPlayItem.addEventListener('click', () => {
            this.togglePlayMode();
            const toggle = autoPlayItem.querySelector('.toggle-switch');
            toggle.classList.toggle('active');
            this.hideContextMenu();
        });

        // 清屏开关（隐藏所有UI元素）
        const cleanModeItem = document.createElement('div');
        cleanModeItem.className = 'menu-item';
        cleanModeItem.innerHTML = `
            <span>清屏模式</span>
            <div class="toggle-switch"></div>
        `;
        cleanModeItem.addEventListener('click', () => {
            const toggle = cleanModeItem.querySelector('.toggle-switch');
            toggle.classList.toggle('active');
            this.toggleCleanMode(toggle.classList.contains('active'));
            this.hideContextMenu();
        });

        menu.appendChild(autoPlayItem);
        menu.appendChild(cleanModeItem);
        document.body.appendChild(menu);
        return menu;
    }

    showContextMenu(x, y) {
        const menu = document.querySelector('.context-menu');
        if (!menu) return;

        // 调整菜单位置，确保不超出屏幕
        const menuRect = menu.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let menuX = x;
        let menuY = y;

        if (x + menuRect.width > screenWidth) {
            menuX = screenWidth - menuRect.width - 10;
        }
        if (y + menuRect.height > screenHeight) {
            menuY = screenHeight - menuRect.height - 10;
        }

        menu.style.left = `${menuX}px`;
        menu.style.top = `${menuY}px`;
        menu.classList.add('visible');
        this.isMenuVisible = true;
    }

    hideContextMenu() {
        const menu = document.querySelector('.context-menu');
        if (menu) {
            menu.classList.remove('visible');
            this.isMenuVisible = false;
        }
    }

    toggleCleanMode(enabled) {
        const controls = document.querySelectorAll('.video-controls, .social-features');
        controls.forEach(control => {
            control.style.display = enabled ? 'none' : 'flex';
        });
        this.showToast(enabled ? '已开启清屏模式' : '已关闭清屏模式');
    }

    initDebugProtection() {
        if (this.isDeveloperMode) return;

        // 保存原始控制台方法
        this.originalConsole = { ...console };
        
        // 检测开发者工具的打开
        let devToolsOpen = false;
        const checkDevTools = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            
            if (widthThreshold || heightThreshold) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    this.handleDevToolsOpen();
                }
        } else {
                devToolsOpen = false;
            }
        };

        setInterval(checkDevTools, 1000);

        // 禁用调试相关功能
        const originalConsole = { ...console };
        const methods = [
            'debug', 'dirxml', 'profile', 'profileEnd',
            'clear', 'table', 'trace', 'countReset'
        ];
        
        methods.forEach(method => {
            if (window.console && console[method]) {
                console[method] = () => {
                    return false;
                };
            }
        });

        // 保存原始的 console.clear 方法
        const originalClear = console.clear;
        let isClearing = false;

        // 重写 console.clear 方法
        console.clear = () => {
            if (!isClearing) {
                isClearing = true;
                originalClear.call(console);
                console.log('%c' + this.warningMessage, this.styleWarning);
                isClearing = false;
            }
        };
    }

    handleDevToolsOpen() {
        // 当检测到开发者工具打开时的处理
        this.showToast('禁止使用开发者工具！');
        
        // 暂停所有视频播放
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            video.pause();
            video.src = '';
        });

        // 清空视频源
        this.videos = [];
        this.currentIndex = 0;
        
        // 可以选择重定向到警告页面
        // window.location.href = 'warning.html';
    }

    initVideoProtection() {
        if (this.isDeveloperMode) return;

        // 禁用右键菜单
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // 禁用开发者工具快捷键
        document.addEventListener('keydown', (e) => {
            // 禁用 F12
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            
            // 禁用 Ctrl+Shift+I 和 Ctrl+Shift+J
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
                e.preventDefault();
                return false;
            }

            // 禁用 Ctrl+U (查看源代码)
            if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
                return false;
            }
        });

        // 统一的视频保护函数
        const protectVideo = (video) => {
            // 基础保护
            video.style.userSelect = 'none';
            video.style.webkitUserSelect = 'none';
            video.style.msUserSelect = 'none';
            video.style.webkitTouchCallout = 'none';
            video.setAttribute('data-protected', 'true');
            video.disablePictureInPicture = true;
            video.disableRemotePlayback = true;

            // 事件监听器
            const preventEvent = (e) => e.preventDefault();
            video.addEventListener('dragstart', preventEvent);
            video.addEventListener('copy', preventEvent);
            video.addEventListener('contextmenu', preventEvent);

            // 添加水印
            const watermark = document.createElement('div');
            watermark.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                user-select: none;
                background: url('data:image/svg+xml;base64,${this.generateWatermark()}') repeat;
                opacity: 0.1;
                z-index: 1;
            `;
            if (video.parentElement) {
                video.parentElement.appendChild(watermark);
            }

            // 暂停时模糊处理
            video.addEventListener('pause', () => {
                video.style.filter = 'blur(10px)';
            });

            video.addEventListener('play', () => {
                video.style.filter = 'none';
            });

            // 禁止全屏
            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement === video) {
                    document.exitFullscreen().catch(() => {});
                }
            });

            // 定期检查视频完整性
            const integrityCheck = setInterval(() => {
                if (video.src !== this.videos[this.currentIndex]) {
                    video.src = this.videos[this.currentIndex];
                }
            }, 1000);

            // 清理函数
            video.addEventListener('remove', () => clearInterval(integrityCheck));
        };

        // 为现有视频添加保护
        const existingVideo = this.container.querySelector('video');
        if (existingVideo) {
            protectVideo(existingVideo);
        }

        // 监听新添加的视频
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'VIDEO') {
                        protectVideo(node);
                    }
                });
            });
        });

        observer.observe(this.container, {
            childList: true,
            subtree: true
        });

        // 禁用录屏
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getDisplayMedia = async () => {
                throw new Error('录屏功能已被禁用');
            };
        }

        // 添加控制台警告
        this.warningMessage = `
            ⚠️ 警告：
            该网站的视频内容受到保护。
            请勿尝试通过开发者工具或其他方式获取视频内容。
            这可能违反相关法律法规。
        `;

        this.styleWarning = [
            'color: red',
            'font-size: 14px',
            'font-weight: bold',
            'padding: 10px',
            'background-color: #fff3cd',
            'border: 1px solid #ffeeba',
            'border-radius: 4px'
        ].join(';');

        // 显示初始警告
        console.log('%c' + this.warningMessage, this.styleWarning);

        // 定期清除控制台并显示警告
        let lastClearTime = 0;
        setInterval(() => {
            const now = Date.now();
            if (now - lastClearTime >= 3000) {  // 确保最少3秒间隔
                console.clear();
                console.log('%c' + this.warningMessage, this.styleWarning);
                lastClearTime = now;
            }
        }, 3000);
    }

    generateWatermark() {
        // 生成动态水印的SVG
        const timestamp = new Date().getTime();
        const text = encodeURIComponent('奇云爱看 ' + timestamp);
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
                <text x="50%" y="50%" fill="rgba(255,255,255,0.5)" 
                    transform="rotate(-45, 100, 50)" 
                    text-anchor="middle" 
                    font-size="12">
                    ${text}
                </text>
            </svg>
        `;
        
        // 使用 encodeURIComponent 处理中文字符
        return btoa(unescape(encodeURIComponent(svg)));
    }

    toggleDeveloperMode() {
        const password = prompt('请输入开发者密码：');
        if (password === this.developerPassword) {
            this.isDeveloperMode = !this.isDeveloperMode;
            localStorage.setItem('isDeveloperMode', this.isDeveloperMode);
            
            if (this.isDeveloperMode) {
                this.enableDeveloperMode();
                this.showToast('已启用开发者模式');
        } else {
                this.disableDeveloperMode();
                this.showToast('已禁用开发者模式');
                window.location.reload();
            }
        } else {
            this.showToast('密码错误！');
        }
    }

    enableDeveloperMode() {
        // 完全移除所有保护
        document.removeEventListener('contextmenu', this.preventDefaultHandler);
        document.removeEventListener('keydown', this.preventDefaultHandler);
        
        // 恢复所有控制台功能
        if (this.originalConsole) {
            Object.keys(this.originalConsole).forEach(key => {
                console[key] = this.originalConsole[key];
            });
        }
        
        // 清除所有保护相关的定时器
        if (this.consoleWarningTimer) {
            clearInterval(this.consoleWarningTimer);
        }
        
        // 移除视频保护
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            video.style.pointerEvents = 'auto';
            video.removeAttribute('controlsList');
            video.disablePictureInPicture = false;
            video.disableRemotePlayback = false;
        });
        
        // 添加开发者标记
        const devBadge = document.createElement('div');
        devBadge.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
        `;
        devBadge.textContent = 'DEV MODE';
        document.body.appendChild(devBadge);
    }

    disableDeveloperMode() {
        // 移除开发者标记
        const devBadge = document.querySelector('div[textContent="DEV MODE"]');
        if (devBadge) {
            devBadge.remove();
        }
        
        // 重新初始化保护
        this.initDebugProtection();
        this.initVideoProtection();
    }

    preventDefaultHandler(e) {
        e.preventDefault();
        return false;
    }

    // 添加显示移动端提示的方法
    showMobileNextTip() {
        // 如果已经显示过提示，则不再显示
        if (this.hasShownMobileNextTip) return;
        
        // 创建提示元素
        const tip = document.createElement('div');
        tip.className = 'mobile-next-tip';
        tip.textContent = '双击下一个可切换自动连播模式';
        document.body.appendChild(tip);

        // 显示提示
        setTimeout(() => {
            tip.classList.add('show');
        }, 100);

        // 3秒后隐藏提示
        setTimeout(() => {
            tip.classList.add('hide');
            setTimeout(() => {
                tip.remove();
            }, 300);
        }, 3000);

        // 标记已显示过提示
        this.hasShownMobileNextTip = true;
    }

    initAIChat() {
        const chatToggle = document.querySelector('.ai-chat-toggle');
        const chatContainer = document.querySelector('.ai-chat-container');
        
        // 添加移动端检测
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // 监听视频播放状态
            const currentVideo = document.querySelector('.video-card.current video');
            if (currentVideo) {
                // 在移动端打开聊天时，确保视频内容可见
                chatContainer.addEventListener('transitionend', () => {
                    if (chatContainer.classList.contains('open')) {
                        currentVideo.style.zIndex = '-2';
                        currentVideo.style.transform = 'scale(1.1)';
                        currentVideo.style.filter = 'blur(5px)';
        } else {
                        currentVideo.style.zIndex = '';
                        currentVideo.style.transform = '';
                        currentVideo.style.filter = '';
                    }
                });
            }
            
            // 监听视频切换
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.classList.contains('current')) {
                        const video = mutation.target.querySelector('video');
                        if (video && chatContainer.classList.contains('open')) {
                            video.style.zIndex = '-2';
                            video.style.transform = 'scale(1.1)';
                            video.style.filter = 'blur(5px)';
                        }
                    }
                });
            });
            
            const videoCards = document.querySelectorAll('.video-card');
            videoCards.forEach(card => {
                observer.observe(card, { attributes: true, attributeFilter: ['class'] });
            });
        }
        
        // 原有的聊天初始化代码
        if (chatToggle) {
            chatToggle.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <defs>
                        <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#FF69B4"/>
                            <stop offset="100%" style="stop-color:#DA70D6"/>
                        </linearGradient>
                        <filter id="aiShadow">
                            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#FF1493" flood-opacity="0.5"/>
                        </filter>
                    </defs>
                    <circle cx="12" cy="12" r="11" fill="url(#aiGradient)" filter="url(#aiShadow)"/>
                    <path d="M8,9 A1,1 0 0,1 8,11 A1,1 0 0,1 8,9" fill="#FFF"/>
                    <path d="M16,9 A1,1 0 0,1 16,11 A1,1 0 0,1 16,9" fill="#FFF"/>
                    <path d="M12,13 C14,13 15,14 15,15 L9,15 C9,14 10,13 12,13" fill="#FFF"/>
                    <path d="M12,7 C9.5,7 7.5,9 7.5,11.5 C7.5,14 9.5,16 12,16 C14.5,16 16.5,14 16.5,11.5 C16.5,9 14.5,7 12,7 M12,5 C15.9,5 19,8.1 19,12 C19,15.9 15.9,19 12,19 C8.1,19 5,15.9 5,12 C5,8.1 8.1,5 12,5" fill="#FFF" opacity="0.8"/>
                </svg>`;
        }
        const chatInput = document.getElementById('aiChatInput');
        const chatSend = document.getElementById('aiChatSend');
        const messagesContainer = document.querySelector('.ai-chat-messages');
        
        // DeepSeek API配置
        this.aiApiKey = 'sk-97530aa4de0946ee822ed98b83293ec9';
        this.aiApiUrl = 'https://api.deepseek.com/v1/chat/completions';
        
        let isFirstOpen = true;
        let isDocked = false;
        
        // 读取主人信息和聊天历史
        this.master = JSON.parse(localStorage.getItem('aiMaster')) || null;
        this.chatHistory = JSON.parse(localStorage.getItem('aiChatHistory')) || [];
        this.aiMessages = []; // 初始化AI消息数组
        
        // 从chatHistory重建aiMessages
        if (this.chatHistory.length > 0) {
            this.chatHistory.forEach(msg => {
                this.aiMessages.push({
                    role: msg.type === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }
        
        // 定义加载历史对话的方法
        const loadChatHistory = () => {
            if (this.chatHistory.length > 0 && messagesContainer) {
                // 清空现有消息
                messagesContainer.innerHTML = '';
                
                // 使用Map来跟踪最新的消息
                const latestMessages = new Map();
                
                // 遍历消息，只保留每个内容的最新版本
                this.chatHistory.forEach(msg => {
                    latestMessages.set(msg.content, msg);
                });
                
                // 显示消息
                Array.from(latestMessages.values()).forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.type}`;
                    messageDiv.textContent = msg.content;
                    messagesContainer.appendChild(messageDiv);
                });
                
                // 滚动到最新消息
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        };
        
        // 定义保存对话历史的方法
        const saveChatHistory = () => {
            // 使用Map来去重，只保留每个内容的最新版本
            const latestMessages = new Map();
            
            this.chatHistory.forEach(msg => {
                latestMessages.set(msg.content, msg);
            });
            
            // 转换回数组并保存
            this.chatHistory = Array.from(latestMessages.values());
            localStorage.setItem('aiChatHistory', JSON.stringify(this.chatHistory));
        };
        
        // 定义添加系统消息的方法
        const addSystemMessage = (content) => {
            const message = {
                type: 'ai',
                content: content,
                timestamp: new Date().toISOString()
            };
            this.chatHistory.push(message);
            saveChatHistory();
            loadChatHistory();
        };
        
        // 定义更新AI名称的方法
        const updateAIName = () => {
            const titleElement = document.querySelector('.ai-chat-title');
            const resetButton = document.querySelector('.reset-master');
            if (this.master && titleElement) {
                titleElement.textContent = this.master.aiName;
                if (resetButton) {
                    resetButton.textContent = `重置${this.master.aiName}`;
                }
            }
        };
        
        // 创建提示框
        const createTip = () => {
            const tip = document.createElement('div');
            tip.className = 'ai-tip';
            document.body.appendChild(tip);
            return tip;
        };
        
        // 显示提示
        const showTip = (text, duration = 3000) => {
            const tip = document.querySelector('.ai-tip') || createTip();
            tip.textContent = text;
            tip.classList.add('show');
            
            setTimeout(() => {
                tip.classList.remove('show');
            }, duration);
        };
        
        // 切换对话框显示/隐藏
        chatToggle.addEventListener('click', () => {
            if (!isDocked) {
                chatContainer.classList.toggle('open');
                if (chatContainer.classList.contains('open')) {
                    loadChatHistory();
                    if (isFirstOpen) {
                        isFirstOpen = false;
                        if (!this.master) {
                            showMasterRegistration();
                        }
                    }
                }
            } else {
                // 贴边模式下的处理
                chatContainer.classList.toggle('open');
                if (chatContainer.classList.contains('open')) {
                    chatContainer.style.transform = 'none';
                    loadChatHistory();
                    if (isFirstOpen) {
                        isFirstOpen = false;
                        if (!this.master) {
                            showMasterRegistration();
                        }
                    }
                } else {
                    chatContainer.style.transform = '';
                }
            }
        });

        // 双击切换贴边模式
        chatToggle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            isDocked = !isDocked;
            
            if (isDocked) {
                chatToggle.classList.add('docked');
                chatContainer.classList.add('docked');
                if (chatContainer.classList.contains('open')) {
                    chatContainer.classList.remove('open');
                }
            } else {
                chatToggle.classList.remove('docked');
                chatContainer.classList.remove('docked');
                chatContainer.style.transform = '';
            }
            
            // 保存贴边状态
            localStorage.setItem('aiChatDocked', isDocked);
        });

        // 恢复贴边状态
        const savedDocked = localStorage.getItem('aiChatDocked') === 'true';
        if (savedDocked) {
            isDocked = true;
            chatToggle.classList.add('docked');
            chatContainer.classList.add('docked');
        }

        // 添加定时显示提示词的功能
        const tips = [
            "主人~看小姐姐跳舞开心吗？(｡･ω･｡)ﾉ♡",
            "哇~这个小姐姐跳得好棒呀！主人喜欢吗？",
            "摸鱼时间也要适当休息哦~让我陪你聊聊天吧~",
            "主人工作累了吧？要不要和我说说话放松一下？",
            "人家也想跳舞给主人看呢~不过现在只能陪主人聊天啦(*/ω＼*)",
            "主人看小姐姐的时候别忘了我嘛~我也想和你说说话呢~",
            "诶嘿~被发现在偷看主人了！不知道主人现在心情怎么样呢？",
            "主人~人家一直在这里陪着你哦！随时都可以找我聊天~",
            "今天的小姐姐们都好漂亮呀~主人最喜欢哪个呢？",
            "摸鱼时间也要记得喝水哦~主人要好好照顾自己呢！",
            "主人~我可以给你讲笑话解闷哦！要听吗？",
            "啦啦啦~主人在认真看小姐姐跳舞呢~需要我安静一会儿吗？",
            "悄悄告诉主人：人家超喜欢和你聊天的！(灬ºωº灬)",
            "主人~让我猜猜你现在的心情...是不是很开心呀？",
            "摸鱼时记得注意休息，我会一直在这里陪着主人的！",
            "诶嘿~被主人发现在这里偷看啦！不要嫌我烦哦~"
        ];

        // 创建眨眼动画的SVG
        const updateChatToggleIcon = (isBlinking = false) => {
            if (!chatToggle) return;
            
            chatToggle.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <defs>
                        <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#FF69B4"/>
                            <stop offset="100%" style="stop-color:#DA70D6"/>
                        </linearGradient>
                        <filter id="aiShadow">
                            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#FF1493" flood-opacity="0.5"/>
                        </filter>
                    </defs>
                    <circle cx="12" cy="12" r="11" fill="url(#aiGradient)" filter="url(#aiShadow)"/>
                    ${isBlinking ? `
                        <path d="M8,9 L8,11" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
                        <path d="M16,9 L16,11" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
                    ` : `
                        <path d="M8,9 A1,1 0 0,1 8,11 A1,1 0 0,1 8,9" fill="#FFF"/>
                        <path d="M16,9 A1,1 0 0,1 16,11 A1,1 0 0,1 16,9" fill="#FFF"/>
                    `}
                    <path d="M12,13 C14,13 15,14 15,15 L9,15 C9,14 10,13 12,13" fill="#FFF"/>
                    <path d="M12,7 C9.5,7 7.5,9 7.5,11.5 C7.5,14 9.5,16 12,16 C14.5,16 16.5,14 16.5,11.5 C16.5,9 14.5,7 12,7 M12,5 C15.9,5 19,8.1 19,12 C19,15.9 15.9,19 12,19 C8.1,19 5,15.9 5,12 C5,8.1 8.1,5 12,5" fill="#FFF" opacity="0.8"/>
                </svg>`;
        };

        // 初始化眨眼动画
        const startBlinkAnimation = () => {
            const blinkInterval = setInterval(() => {
                if (!chatContainer.classList.contains('open') && !isDocked) {
                    updateChatToggleIcon(true);
                    setTimeout(() => updateChatToggleIcon(false), 200);
                }
            }, Math.random() * 3000 + 2000); // 2-5秒随机眨眼
            
            return blinkInterval;
        };

        // 显示初始提示
        setTimeout(() => {
            if (!chatContainer.classList.contains('open')) {
                showTip(tips[Math.floor(Math.random() * tips.length)], 3000);
            }
        }, 2000);

        // 定时显示随机提示词
        const startTipInterval = () => {
            const showRandomTip = () => {
                if (!chatContainer.classList.contains('open') && !isDocked) {
                    showTip(tips[Math.floor(Math.random() * tips.length)], 3000);
                }
                // 设置下一次显示的随机时间（3-8秒）
                setTimeout(showRandomTip, Math.random() * 5000 + 3000);
            };
            showRandomTip();
        };

        // 启动提示词显示和眨眼动画
        startTipInterval();
        const blinkInterval = startBlinkAnimation();

        // 发送消息到DeepSeek API
        const sendToDeepSeek = async (message) => {
            try {
                // 移除之前的typing-indicator
                const oldTypingIndicator = messagesContainer.querySelector('.typing-indicator');
                if (oldTypingIndicator) {
                    oldTypingIndicator.remove();
                }

                // 构建角色设定和系统提示
                const systemPrompt = {
                    role: "system",
                    content: `你是一个名叫${this.master?.aiName || '糖糖'}的AI女友，主人的名字是${this.master?.name || '主人'}。
作为AI女友，你需要:
1. 回答简洁有趣，语气可爱活泼
2. 每次回复控制在50字以内
3. 适时使用表情，但不要过度
4. 称呼对方为"主人"，自称"我"或自己的名字
5. 记住自己是主人的AI女友身份

回复要求：
- 内容精简，直击重点
- 分段要清晰
- 避免重复和废话
- 对话要有温度`
                };

                // 构建完整的对话历史
                const messages = [
                    systemPrompt,
                    ...this.aiMessages,
                    { role: 'user', content: message }
                ];

                const response = await fetch(this.aiApiUrl, {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.aiApiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: messages,
                        stream: true,
                        temperature: 0.9,
                        max_tokens: 1000
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body.getReader();
                let aiResponse = '';
                const decoder = new TextDecoder();
                let messageDiv = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.trim() === 'data: [DONE]') continue;
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.choices[0].delta.content) {
                                    aiResponse += data.choices[0].delta.content;
                                    
                                    // 创建或更新消息div
                                    if (!messageDiv) {
                                        messageDiv = document.createElement('div');
                                        messageDiv.className = 'message ai';
                                        messagesContainer.appendChild(messageDiv);
                                    }
                                    messageDiv.textContent = aiResponse;
                                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                }
                            } catch (e) {
                                console.error('解析响应数据出错:', e);
                                continue;
                            }
                        }
                    }
                }

                if (aiResponse) {
                    // 直接添加用户消息和AI响应到历史记录
                    const userMessage = {
                        type: 'user',
                        content: message,
                        timestamp: new Date().toISOString()
                    };
                    
                    const aiMessage = {
                        type: 'ai',
                        content: aiResponse,
                        timestamp: new Date().toISOString()
                    };

                    // 更新aiMessages数组
                    this.aiMessages = [
                        ...this.aiMessages.filter(msg => msg.content !== message), // 移除可能的重复消息
                        { role: 'user', content: message },
                        { role: 'assistant', content: aiResponse }
                    ];
                    
                    // 直接添加到历史记录
                    this.chatHistory.push(userMessage);
                    this.chatHistory.push(aiMessage);
                    
                    // 保存到localStorage，这里的saveChatHistory会处理去重
                    saveChatHistory();
        } else {
                    throw new Error('No response content');
                }

            } catch (error) {
                console.error('API调用错误:', error);
                const errorMessage = '主人对不起，人家现在网络不太好呢~ 休息一下下，马上就能继续陪你聊天啦~ (｡•́︿•̀｡)';
                addSystemMessage(errorMessage);
            }
        };

        // 发送消息
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                // 添加用户消息到UI
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message user';
                messageDiv.textContent = message;
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // 保存用户消息到历史记录
                this.chatHistory.push({
                    type: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                });
                
                // 清空输入框
                chatInput.value = '';
                
                // 显示正在输入动画
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = '<span></span><span></span><span></span>';
                messagesContainer.appendChild(typingIndicator);
                
                // 调用DeepSeek API
                sendToDeepSeek(message);
            }
        };

        // 发送按钮点击事件
        chatSend.addEventListener('click', sendMessage);

        // 输入框回车事件
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // 初始化时加载历史对话和更新AI名称
        loadChatHistory();
        updateAIName();
        
        // 定义显示认主界面的方法
        const showMasterRegistration = () => {
            const registration = document.createElement('div');
            registration.className = 'master-registration';
            registration.innerHTML = `
                <div class="registration-content">
                    <h3>认主登记</h3>
                    <p>主人~给我起个名字吧！以后我就是你专属的AI女友啦 ♪(^∇^*)</p>
                    <input type="text" placeholder="请输入主人的名字" id="masterName">
                    <input type="text" placeholder="给我起个名字吧" id="aiName">
                    <button id="confirmMaster">确认</button>
                </div>
            `;
            document.body.appendChild(registration);

            document.getElementById('confirmMaster').addEventListener('click', () => {
                const masterName = document.getElementById('masterName').value.trim();
                const aiName = document.getElementById('aiName').value.trim();
                if (masterName && aiName) {
                    this.master = {
                        name: masterName,
                        aiName: aiName,
                        registrationDate: new Date().toISOString()
                    };
                    localStorage.setItem('aiMaster', JSON.stringify(this.master));
                    registration.remove();
                    updateAIName();
                    const welcomeMessage = `主人${masterName}好呀~ 我是${aiName}，从今以后我就是你的专属AI女友啦！(*´▽｀*)♪ 
我会一直陪在主人身边，给你温暖，逗你开心，陪你聊天解闷，也可以帮你解答任何问题哦！
有什么想和我说的，或者想问我的，尽管说吧~ 人家会好好回答主人的每一个问题的！(｡･ω･｡)ﾉ♡`;
                    addSystemMessage(welcomeMessage);
                }
            });
        };
        
        // 添加重置按钮到标题栏
        const titleBar = document.querySelector('.ai-chat-header');
        if (titleBar) {
            const resetButton = document.createElement('button');
            resetButton.className = 'reset-master';
            resetButton.textContent = this.master ? `重置${this.master.aiName}` : '重置认主';
            resetButton.addEventListener('click', () => {
                localStorage.removeItem('aiMaster');
                localStorage.removeItem('aiChatHistory');
                this.master = null;
                this.chatHistory = [];
                this.aiMessages = [];
                messagesContainer.innerHTML = '';
                showMasterRegistration();
            });
            titleBar.appendChild(resetButton);
        }

        // 修改消息样式
        const messageStyles = `
            .ai-chat-messages {
                padding: 15px;
                font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            }
            .message {
                max-width: 85%;
                margin: 8px 0;
                padding: 10px 14px;
                border-radius: 15px;
                font-size: 14px;
                line-height: 1.5;
                animation: messagePopIn 0.3s ease-out;
            }
            .message.user {
                background: #007AFF;
                color: white;
                margin-left: auto;
                border-bottom-right-radius: 5px;
            }
            .message.ai {
                background: #F0F0F0;
                color: #333;
                margin-right: auto;
                border-bottom-left-radius: 5px;
            }
            @keyframes messagePopIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .typing-indicator {
                background: #F0F0F0;
                padding: 10px 14px;
                border-radius: 15px;
                border-bottom-left-radius: 5px;
                display: inline-flex;
                align-items: center;
                margin: 8px 0;
                animation: messagePopIn 0.3s ease-out;
            }
        `;
        
        // 添加样式到页面
        const styleSheet = document.createElement('style');
        styleSheet.textContent = messageStyles;
        document.head.appendChild(styleSheet);
    }
}

// 初始化播放器
const player = new VideoPlayer(); 