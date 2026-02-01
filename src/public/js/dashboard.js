async function loadDashboard() {
  try {
    const meRes = await fetch('/api/auth/me');
    if (!meRes.ok) {
      window.location.href = '/login';
      return;
    }
    const me = await meRes.json();
    document.getElementById('user-name').textContent = me.name;
    document.getElementById('user-email').textContent = me.email;

    const usersRes = await fetch('/api/users');
    const users = await usersRes.json();
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      const tdId = document.createElement('td');
      tdId.textContent = u.id;
      const tdName = document.createElement('td');
      tdName.textContent = u.name;
      const tdEmail = document.createElement('td');
      tdEmail.textContent = u.email;
      const tdDate = document.createElement('td');
      tdDate.textContent = u.created_at || '';
      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdEmail);
      tr.appendChild(tdDate);
      tbody.appendChild(tr);
    });
  } catch {
    window.location.href = '/login';
  }
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
});

loadDashboard();
