const user = JSON.parse(localStorage.getItem("currentUser"));

if (!user) {
    window.location.href = "login.html";
}