let position = { x: 0, y: 0 }
let world = {}
let stompClient = null
let visibleRegion = { x1: 0, y1: 0, x2: -1, y2: -1 }
const VIEW_RADIUS = 50
const CELL_SIZE = 24

function connect(callback) {
    const socket = new SockJS('/text-wall-socket');
    stompClient = Stomp.over(socket);
    stompClient.debug = function (){};//do nothing
    stompClient.connect({}, function (_frame) {
        //console.log('Connected: ' + frame);
        stompClient.subscribe('/user/topic/updates', function (data) {
            handleUpdate(JSON.parse(data.body));
        });
        stompClient.subscribe('/user/topic/errors', function (data) {
           console.error("Server reported error", JSON.parse(data.body));
        });
        callback()
    });
}

function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    //console.log("Disconnected");
}

function updateText(x, y, content) {
    stompClient.send("/app/update", {}, JSON.stringify({
        'pos': {
            'x': x,
            'y': y,
        },
        'content': content,
    }));
}

function getWorld(x, y) {
    let yArray = world[x]
    if (yArray !== undefined) {
        let c = yArray[y]
        if (c === undefined) {
            return '_'
        }
        else
            return c
    } else {
        return '-'
    }
}

function setWorld(x, y, c) {
    let yArray = world[x]
    if (yArray !== undefined) {
        yArray[y] = c
    } else {
        world[x] = {}
        world[x][y] = c
    }
}

function move(x, y) {
    position.x = x
    position.y = y
    stompClient.send("/app/move", {}, JSON.stringify({
        'x': x,
        'y': y,
    }));

    let wantedRegion = {
        x1: x - VIEW_RADIUS,
        y1: y - VIEW_RADIUS,
        x2: x + VIEW_RADIUS,
        y2: y + VIEW_RADIUS,
    }
    let toDownload = []
    let downloaded = visibleRegion
    if (wantedRegion.x1 < downloaded.x1) {
        toDownload.push({
            x1: wantedRegion.x1,
            y1: wantedRegion.y1,
            x2: downloaded.x1-1,
            y2: wantedRegion.y2,
        })
        downloaded.x1 = wantedRegion.x1
    }
    if (wantedRegion.x2 > downloaded.x2) {
        toDownload.push({
            x1: downloaded.x2+1,
            y1: downloaded.y1,
            x2: wantedRegion.x2,
            y2: downloaded.y2,
        })
        downloaded.x2 = wantedRegion.x2
    }
    if (wantedRegion.y1 < downloaded.y1) {
        toDownload.push({
            x1: wantedRegion.x1,
            y1: wantedRegion.y1,
            x2: wantedRegion.x2,
            y2: downloaded.y1-1,
        })
        downloaded.y1 = wantedRegion.y1
    }
    if (wantedRegion.y2 > downloaded.y2) {
        toDownload.push({
            x1: wantedRegion.x1,
            y1: downloaded.y2 + 1,
            x2: wantedRegion.x2,
            y2: wantedRegion.y2,
        })
    }
    for (let i = 0; i < toDownload.length; ++i) {
        let r = toDownload[i]
        stompClient.send("/app/region", {}, JSON.stringify(r))
    }
    visibleRegion = wantedRegion
    repaintScreen()
}

function handleUpdate(data) {
    // Single cell update
    if (data['pos'] !== undefined) {
        let x = data['pos']['x']
        let y = data['pos']['y']
        setWorld(x, y, data['content'])
        repaintRegion(x, y, x, y)
    }
    // Region update
    if (data['region'] !== undefined) {
        let x1 = data['region']['x1']
        let y1 = data['region']['y1']
        let x2 = data['region']['x2']
        let y2 = data['region']['y2']
        let content = data['content']
        for (let y = y1; y <= y2; ++y) {
            for (let x = x1; x <= x2; ++x) {
                let yOff = y - y1
                let xOff = x - x1
                let charIndex = yOff * (x2-x1+1) + xOff
                let char = content.charAt(charIndex)
                setWorld(x, y, char)
            }
        }
        repaintRegion(x1, y1, x2, y2)
    }
    // Player position updated
    if (data['player'] !== undefined) {
        let player = data['player']
        let x = data['pos']['x']
        let y = data['pos']['y']
        if (player === "you")
            move(x, y)
    }
}

function repaintRegion(x1, y1, x2, y2) {
    //console.log(`Repainting: ${x1},${y1} - ${x2},${y2}`)
    let grid = document.getElementById('grid')
    let ctx = grid.getContext('2d')

    ctx.font = "20px Topaz-8, monospace"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'white'

    // Cover over the background
    ctx.fillStyle = `rgb(0,${Math.random()*10},${Math.random()*10})`
    ctx.fillRect((x1-position.x)*CELL_SIZE+grid.width/2, (y1-position.y)*CELL_SIZE+grid.height/2,
        (x2-x1+1)*CELL_SIZE, (y2-y1+1)*CELL_SIZE)
    if (x1 <= position.x && y1 <= position.y && x2 >= position.x && y2 >= position.y) {
        ctx.fillStyle = 'yellow'
        ctx.fillRect(grid.width/2, grid.height/2, CELL_SIZE, CELL_SIZE)
    }

    // Paint the background
    ctx.fillStyle = 'white'
    for (let x = x1; x <= x2; ++x) {
        for (let y = y1; y <= y2; ++y) {
            let c = getWorld(x, y)
            let xDraw = (x - position.x) * CELL_SIZE + grid.width/2 + CELL_SIZE/2
            let yDraw = (y - position.y) * CELL_SIZE + grid.height/2 + CELL_SIZE/2
            ctx.fillText(c, xDraw, yDraw)
        }
    }
}

function repaintScreen() {
    //console.log(`Repaint Screen`)
    let canvas = document.getElementById('grid')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    let x1 = Math.floor(position.x - canvas.width / (2 * CELL_SIZE))
    let y1 = Math.floor(position.y - canvas.height / (2 * CELL_SIZE))
    let x2 = Math.ceil(position.x + canvas.width / (2 * CELL_SIZE))
    let y2 = Math.ceil(position.y + canvas.height / (2 * CELL_SIZE))
    repaintRegion(x1, y1, x2, y2)
}

$(function () {
    $("form").on('submit', function (e) {
        e.preventDefault();
    });
    $( "#connect" ).click(function() { connect(); });
    $( "#disconnect" ).click(function() { disconnect(); });
    $( "#update" ).click(function() {
        const x = parseInt($("#xUpdate").val());
        const y = parseInt($("#yUpdate").val());
        const content = $("#content").val();
        updateText(x, y, content);
    });
    $( "#move" ).click(function() {
        const x = parseInt($("#xMove").val());
        const y = parseInt($("#yMove").val());
        move(x, y);
    });
    $(window).resize(function() {
        repaintScreen()
    })

    connect(function () {
        move(0, 0)
        repaintScreen()
    })

    document.onkeydown = function(e) {
        e.preventDefault()

        let dx = 0;
        let dy = 0;

        switch (e.key) {
            case 'ArrowLeft':  dx = -1; break;
            case 'ArrowRight': dx =  1; break;
            case 'ArrowUp':    dy = -1; break;
            case 'ArrowDown':  dy =  1; break;
        }
        if (dx !== 0 || dy !== 0) {
            if (e.ctrlKey) {
                dx *= 8;
                dy *= 8;
            }
            move(position.x + dx, position.y + dy);
        } else {
            if (e.key.length === 1 && e.key >= ' ' && e.key <= '~') {
                updateText(position.x, position.y, e.key)
                move(position.x+1, position.y)
            } else {
                switch (e.key) {
                    case 'Backspace':
                        move(position.x - 1, position.y);
                        updateText(position.x, position.y, ' ')
                        break;
                    case 'Delete':
                        updateText(position.x, position.y, ' ')
                        move(position.x + 1, position.y);
                        break;
                    case 'Enter':
                        move(position.x, position.y+1);
                        break;
                }
            }
        }
    };
});