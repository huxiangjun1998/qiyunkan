class Profile {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.initializeProfile();
        this.initializeEventListeners();
    }

    initializeProfile() {
        // 加载用户信息
        document.getElementById('profileUsername').textContent = this.currentUser.username;
        
        // 加载用户头像
        const avatar = document.getElementById('userAvatar');
        if (this.currentUser.avatar) {
            avatar.src = this.currentUser.avatar;
        }

        // 加载用户统计数据
        this.loadUserStats();
        
        // 加载点赞内容
        this.loadLikes();
    }

    initializeEventListeners() {
        // 头像上传
        const avatarUpload = document.getElementById('avatarUpload');
        avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));

        // 退出登录按钮
        const logoutButton = document.querySelector('.logout-btn');
        logoutButton.addEventListener('click', () => this.handleLogout());
    }

    loadUserStats() {
        // 从localStorage加载统计数据
        const stats = JSON.parse(localStorage.getItem(`userStats_${this.currentUser.username}`) || '{}');
        document.getElementById('likeCount').textContent = stats.likes || 0;
    }

    loadLikes() {
        const contentContainer = document.getElementById('tabContent');
        contentContainer.innerHTML = ''; // 清空当前内容

        // 从localStorage加载点赞内容
        const likes = JSON.parse(localStorage.getItem(`likes_${this.currentUser.username}`) || '[]');
        
        if (likes.length === 0) {
            contentContainer.innerHTML = '<div class="empty-message">还没有点赞过视频哦~</div>';
            return;
        }

        // 创建网格容器
        const gridContainer = document.createElement('div');
        gridContainer.className = 'video-grid';
        contentContainer.appendChild(gridContainer);

        // 分页加载，每页20个
        const itemsPerPage = 20;
        let currentPage = 0;

        const loadMoreItems = () => {
            const start = currentPage * itemsPerPage;
            const end = start + itemsPerPage;
            const pageItems = likes.slice(start, end);

            pageItems.forEach(item => {
                const card = this.createVideoCard(item);
                gridContainer.appendChild(card);
            });

            currentPage++;

            // 如果还有更多内容，显示加载更多按钮
            if (end < likes.length) {
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.className = 'load-more-btn';
                loadMoreBtn.textContent = '加载更多';
                loadMoreBtn.onclick = () => {
                    loadMoreBtn.remove();
                    loadMoreItems();
                };
                contentContainer.appendChild(loadMoreBtn);
            }
        };

        loadMoreItems();
    }

    createVideoCard(item) {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        // 添加缩略图
        const thumbnail = document.createElement('div');
        thumbnail.className = 'video-thumbnail';
        thumbnail.style.backgroundImage = `url(${item.thumbnail})`;
        
        // 添加时间信息
        const timeInfo = document.createElement('div');
        timeInfo.className = 'time-info';
        timeInfo.textContent = this.formatTime(item.timestamp);
        
        // 添加播放按钮
        const playButton = document.createElement('button');
        playButton.className = 'play-button';
        playButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>';
        
        // 点击播放视频
        card.addEventListener('click', () => {
            // 保存当前URL
            const currentUrl = window.location.href;
            // 将视频URL和当前位置保存到sessionStorage
            sessionStorage.setItem('returnToProfile', currentUrl);
            sessionStorage.setItem('playVideo', item.url);
            // 跳转到首页播放
            window.location.href = 'index.html';
        });
        
        card.appendChild(thumbnail);
        card.appendChild(timeInfo);
        card.appendChild(playButton);
        
        return card;
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

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatar = document.getElementById('userAvatar');
                avatar.src = e.target.result;
                
                // 保存头像到localStorage
                this.currentUser.avatar = e.target.result;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                this.showMessage('头像更新成功！');
            };
            reader.readAsDataURL(file);
        }
    }

    handleLogout() {
        if (confirm('确认退出登录？')) {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    }

    showMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
}

// 初始化个人中心页面
new Profile(); 