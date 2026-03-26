// Displays a birthday pancake beside the 'Active since May 13th, 2021'
// on the Homepage when it's suzzy games birthday :3
(() => {
    const t = new Date()
    if (t.getMonth() === 4 && t.getDate() === 13) {
        document.querySelector('#birthday')!.textContent += '🥞'
    }
})()