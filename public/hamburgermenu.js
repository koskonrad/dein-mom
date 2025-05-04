async function createHamburgerMenu() {
    const me = await fetch('/me').then(r => r.json())

    console.log(me);
    
    document.getElementById('burger-menu').innerHTML = `
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="dropdown">
            ${me.username === 'public' 
            ? `
                <a href="/login">Login</a>
                <a href="/signup">Register</a>
              `
            : `
                <a href="/stats">Stats für ${me.username}</a>
                ${
                    window.location.pathname === '/'
                    ? `<a href="/konrad">Konrad</a>`
                    : `<a href="/">Mom</a>`
                }
                <a href="/logout">Logout</a>
            `}
        </div>
    `
}