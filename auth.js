class Auth {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.isLoginMode = true;
        
        // 默认头像 - Base64编码的SVG
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
        
        this.initializeEvents();
    }

    initializeEvents() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        const switchFormButton = this.form.querySelector('.switch-form');
        switchFormButton.addEventListener('click', () => {
            this.toggleForm();
        });
    }

    handleSubmit() {
        const username = this.form.querySelector('input[type="text"]').value;
        const password = this.form.querySelector('input[type="password"]').value;
        
        if (this.isLoginMode) {
            // 登录逻辑
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.username === username && u.password === password);
            
            if (user) {
                // 生成一个模拟的token（实际项目中应该由服务器生成）
                const token = btoa(username + ':' + new Date().getTime());
                localStorage.setItem('token', token);
                localStorage.setItem('currentUser', JSON.stringify({
                    username: user.username,
                    token: token,
                    avatar: user.avatar
                }));
                this.showMessage('登录成功！');
                
                // 获取返回URL
                const returnUrl = localStorage.getItem('returnUrl') || 'index.html';
                localStorage.removeItem('returnUrl'); // 清除返回URL
                window.location.href = returnUrl;
            } else {
                this.showMessage('用户名或密码错误！');
            }
        } else {
            // 注册逻辑
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // 检查用户名是否已存在
            if (users.some(u => u.username === username)) {
                this.showMessage('用户名已存在！');
                return;
            }

            // 添加新用户，包含默认头像
            users.push({
                username,
                password,
                avatar: this.defaultAvatar
            });
            localStorage.setItem('users', JSON.stringify(users));
            
            this.showMessage('注册成功！');
            this.toggleForm(); // 切换回登录表单
        }
    }

    toggleForm() {
        this.isLoginMode = !this.isLoginMode;
        const title = this.form.querySelector('h2');
        const switchText = this.form.querySelector('.switch-form');
        const submitButton = this.form.querySelector('button[type="submit"]');
        
        if (this.isLoginMode) {
            title.textContent = '登录';
            switchText.textContent = '还没有账号？点击注册';
            submitButton.textContent = '登录';
        } else {
            title.textContent = '注册';
            switchText.textContent = '已有账号？点击登录';
            submitButton.textContent = '注册';
        }
    }

    showMessage(message) {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            animation: fadeInOut 3s forwards;
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }
}

// 初始化认证
const auth = new Auth(); 