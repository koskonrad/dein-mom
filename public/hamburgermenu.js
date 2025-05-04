async function createHamburgerMenu() {
    const me = await fetch('/me').then(r => r.json());
    const path = window.location.pathname;
    let links = [];
  
    if (me.username === 'public') {
      // öffentlich (nicht eingeloggt)
      links = [
        `<a href="/login">Login</a>`,
        `<a href="/signup">Register</a>`
      ];
    } else {
      // eingeloggt
      if (path === '/') {
        // Root: Stats & Konrad
        links = [
          `<a href="/stats">Stats für ${me.username}</a>`,
          `<a href="/konrad">Konrad</a>`
        ];
      } else if (path === '/konrad') {
        // Konrad-Seite: Stats & Mom
        links = [
          `<a href="/stats">Stats für ${me.username}</a>`,
          `<a href="/">Mom</a>`
        ];
      } else if (path === '/stats') {
        // Stats-Seite: Mom & Konrad
        links = [
          `<a href="/">Mom</a>`,
          `<a href="/konrad">Konrad</a>`
        ];
      } else {
        // Fallback für alle anderen URLs
        links = [
          `<a href="/stats">Stats für ${me.username}</a>`,
          `<a href="/">Mom</a>`,
          `<a href="/konrad">Konrad</a>`
        ];
      }
      // am Ende immer Logout
      links.push(`<a href="/logout">Logout</a>`);
    }
  
    document.getElementById('burger-menu').innerHTML = `
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="dropdown">
        ${links.join('')}
      </div>
    `;
  }
  