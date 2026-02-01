function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      return showError('All fields are required');
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return showError(data.error || 'Login failed');
      }
      window.location.href = '/dashboard';
    } catch {
      showError('Network error');
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!name || !email || !password) {
      return showError('All fields are required');
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (!res.ok) {
        return showError(data.error || 'Registration failed');
      }
      window.location.href = '/login';
    } catch {
      showError('Network error');
    }
  });
}

// Google Sign-In
async function initGoogleSignIn() {
  try {
    const res = await fetch('/api/auth/google-client-id');
    const { clientId } = await res.json();
    if (!clientId) return;

    document.getElementById('google-signin-container').style.display = 'block';

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse
      });
      google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
      );
    };
    document.head.appendChild(script);
  } catch {
    // Silently fail - Google sign-in is optional
  }
}

async function handleGoogleResponse(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (!res.ok) {
      return showError(data.error || 'Google login failed');
    }
    window.location.href = '/dashboard';
  } catch {
    showError('Network error');
  }
}

initGoogleSignIn();
