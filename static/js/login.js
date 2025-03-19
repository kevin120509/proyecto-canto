document.addEventListener('DOMContentLoaded', function() {
    // Elementos de formulario
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.register-form');
    const loginTab = document.querySelector('a[href="#login"]');
    const registerTab = document.querySelector('a[href="#register"]');
    
    // Elementos de animación
    const title = document.querySelector('.login-title');
    const features = document.querySelectorAll('.feature-item');
    
    // Animaciones de entrada
    if (title) {
        title.classList.add('animate-title');
    }
    
    // Animaciones para características
    features.forEach((feature, index) => {
        setTimeout(() => {
            feature.classList.add('animate-feature');
        }, 300 + (index * 200));
    });
    
    // Alternar entre pestañas
    loginTab.addEventListener('click', function() {
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('error');
        });
    });
    
    registerTab.addEventListener('click', function() {
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('error');
        });
    });
    
    // Efectos en los inputs
    document.querySelectorAll('.form-control').forEach(input => {
        // Efecto de foco
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focus');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('input-focus');
        });
    });
    
    // Validación del formulario de inicio de sesión
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const username = this.querySelector('input[name="username"]');
            const password = this.querySelector('input[name="password"]');
            let isValid = true;
            
            // Limpiar errores previos
            document.querySelectorAll('.form-control').forEach(input => {
                input.classList.remove('error');
            });
            
            // Validar usuario
            if (username.value.trim().length < 3) {
                username.classList.add('error');
                showError(username, 'El usuario debe tener al menos 3 caracteres');
                isValid = false;
            }
            
            // Validar contraseña
            if (password.value.trim().length === 0) {
                password.classList.add('error');
                showError(password, 'Debes ingresar tu contraseña');
                isValid = false;
            }
            
            if (!isValid) {
                e.preventDefault();
                animateError();
            } else {
                // Mostrar animación de carga
                const button = this.querySelector('button[type="submit"]');
                button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ingresando...';
                button.disabled = true;
            }
        });
    }
    
    // Validación del formulario de registro
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const name = this.querySelector('input[name="name"]');
            const email = this.querySelector('input[name="email"]');
            const username = this.querySelector('input[name="username"]');
            const password = this.querySelector('input[name="password"]');
            let isValid = true;
            
            // Limpiar errores previos
            document.querySelectorAll('.form-control').forEach(input => {
                input.classList.remove('error');
            });
            
            // Validar nombre
            if (name.value.trim().length < 3) {
                name.classList.add('error');
                showError(name, 'Ingresa tu nombre completo');
                isValid = false;
            }
            
            // Validar email
            if (!validateEmail(email.value)) {
                email.classList.add('error');
                showError(email, 'Ingresa un correo electrónico válido');
                isValid = false;
            }
            
            // Validar usuario
            if (username.value.trim().length < 3) {
                username.classList.add('error');
                showError(username, 'El usuario debe tener al menos 3 caracteres');
                isValid = false;
            }
            
            // Validar contraseña
            if (password.value.trim().length === 0) {
                password.classList.add('error');
                showError(password, 'Debes crear una contraseña');
                isValid = false;
            } else if (password.value.length > 6) {
                password.classList.add('error');
                showError(password, 'La contraseña no debe tener más de 6 caracteres');
                isValid = false;
            }
            
            if (!isValid) {
                e.preventDefault();
                animateError();
            } else {
                // Mostrar animación de carga
                const button = this.querySelector('button[type="submit"]');
                button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creando cuenta...';
                button.disabled = true;
            }
        });
    }
    
    // Validador de correo electrónico
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }
    
    // Mostrar mensaje de error
    function showError(element, message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback d-block';
        errorElement.textContent = message;
        
        // Eliminar mensajes de error previos
        const parent = element.parentElement;
        parent.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        
        // Agregar nuevo mensaje
        parent.appendChild(errorElement);
    }
    
    // Animación al encontrar error
    function animateError() {
        const card = document.querySelector('.login-card');
        card.classList.add('shake-error');
        
        setTimeout(() => {
            card.classList.remove('shake-error');
        }, 500);
    }
    
    // Limitar caracteres en la contraseña
    const passwordInput = document.querySelector('#register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
                this.classList.add('error');
                showError(this, 'Máximo 6 caracteres');
                animateError();
            } else {
                this.classList.remove('error');
                const parent = this.parentElement;
                parent.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            }
        });
    }
});