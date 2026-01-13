(() => {

    // SUPER SOPHISTICATED ANTICHEAT //
    const search = new URLSearchParams(document.location.search)
    let field_name, field_time, field_cheat

    if (localStorage.getItem("secret_picross_complete")) {
        // Normal Ending :3
        field_name = search.get("name")
        field_time = search.get("time")

    } else {
        // Cheater Ending...
        alert("i know what you are...")
        field_name = "cheater mccheater pants"
        field_time = "whatever"
        field_cheat = "CHEATED"
    }

    document.querySelector("span#date").textContent = new Date().toDateString()
    document.querySelector("span#time").textContent =field_time 
    document.querySelector("span#name").textContent = field_name
    document.querySelector("span#cheat").textContent = field_cheat
    document.querySelector("div.layout-document").style.opacity = '1'

})()