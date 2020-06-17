'use strict';

let DEBUG = false;

let canva = null;
let scaleFactor = 1;
let [offX, offY] = [0.0, 0.0];
let mpX, mpY;
let basePrice = 23;
let router = new Router(basePrice);
let pointSize = 15;
let btn_clear_graph, btn_create_node, btn_remove_node, btn_add_route;
let btn_serialize_graph, btn_deserialize_graph;
let selected_nodes = {
    first: null,
    second: null,
    foundRoutes: false,
    isUniversal: false,
    isCalculating: false,
    fastest_route: {
        route: [],
        route_stats: {},
        ellapsed_time: 0,
    },
    cheapest_route: {
        route: [],
        route_stats: {},
        ellapsed_time: 0,
    },
}

let calculateRoutes = async function() {
    selected_nodes.isCalculating = true;
    try {

        let r2 = performance.now()
        selected_nodes.cheapest_route.route = router.findCheapestRoute(selected_nodes.first, selected_nodes.second);
        selected_nodes.cheapest_route.route_stats = router.calcFullRouteStats(selected_nodes.cheapest_route.route);
        selected_nodes.cheapest_route.ellapsed_time = Math.round((performance.now() - r2) * 1000) / 1000;
        let r1 = performance.now()
        selected_nodes.fastest_route.route = router.findFastestRoute(selected_nodes.first, selected_nodes.second);
        selected_nodes.fastest_route.route_stats = router.calcFullRouteStats(selected_nodes.fastest_route.route);
        selected_nodes.fastest_route.ellapsed_time = Math.round((performance.now() - r1) * 1000) / 1000;

        selected_nodes.isUniversal =
            selected_nodes.fastest_route.route_stats.time === selected_nodes.cheapest_route.route_stats.time &&
            selected_nodes.fastest_route.route_stats.money === selected_nodes.cheapest_route.route_stats.money;
    }
    finally {
        selected_nodes.foundRoutes = true;
        selected_nodes.isCalculating = false;
    }
}

let removeOptions = function(selectElement) {
    for (let i = selectElement.options.length - 1; i >= 0; i--) {
        selectElement.remove(i);
    }
}

let cm = function(minutes) {
    return minutes * 60;
}

let clamp = function(value, min, max) {
    return Math.min(Math.max(min, value), max);
}

let process_routes_data = function() {
    router.rebootRouter();

    for (let nd of routes_data.nodes) {
        router.addNode(new Node(nd.id, nd.x, nd.y, pointSize, nd.title));
    }

    for (let rd of routes_data.routes) {
        router.addRoute(rd.from, rd.to, cm(rd.minutes));
    }

    router.notifyAddListeners(null);
    router.notifyRemoveListeners(null);
}

let processTranslationValues = function() {
    // 101 - Numpad_5
    if (keyIsDown(101)) {
        offX = 0;
        offY = 0;
        scaleFactor = 1;
    }
    if (keyIsDown(LEFT_ARROW)) {
        offX += 10;
    }
    else if (keyIsDown(RIGHT_ARROW)) {
        offX -= 10;
    }
    if (keyIsDown(UP_ARROW)) {
        offY += 10;
    }
    else if (keyIsDown(DOWN_ARROW)) {
        offY -= 10;
    }
    // 107 and 187 are keyCodes for "+"
    // 109 and 189 are keyCodes for "-"
    if (keyIsDown(107) || keyIsDown(187)) {
        scaleFactor += .02;
    }
    else if (keyIsDown(109) || keyIsDown(189)) {
        scaleFactor -= .02;
    }

    scaleFactor = clamp(scaleFactor, 0.2, 5);
}

let clear_graph = function() {
    Node.nc = 0;
    selected_nodes = {
        first: null,
        second: null,
        foundRoutes: false,
        isUniversal: false,
        isCalculating: false,
        fastest_route: {
            route: [],
            route_stats: {},
            ellapsed_time: 0,
        },
        cheapest_route: {
            route: [],
            route_stats: {},
            ellapsed_time: 0,
        },
    }
    routes_data.nodes = [];
    routes_data.routes = [];

    process_routes_data();
}

let create_node = function() {
    noLoop();
    let dialog = document.getElementById("create_node_dialog");

    dialog.querySelector("#create_node_dialog_confirm").addEventListener("click", function() {
        let form = dialog.querySelector("form");
        let title = form.in_node_name.value || null;
        let [x, y] = form.in_node_position.value.split(" ").map(el => ~~el);

        if (title === null || y === undefined) {
            return;
        }

        let new_id = router.nodes.length;
        let last_node = router.nodes.slice(-1)[0];
        if (last_node !== undefined) {
            new_id = last_node.id + 1;
        }

        router.addNode(new Node(new_id, x, y, pointSize, title));

        form.reset();
        dialog.close();
        loop();
    });

    dialog.querySelector("#create_node_dialog_cancel").addEventListener("click", function() {
        loop();
        dialog.close();
    });

    dialog.showModal();
}

let create_route = function() {
    noLoop();
    let dialog = document.getElementById("manage_connections_dialog");
    let form = dialog.querySelector("form");

    let get_node_ids = function() {
        return [~~form.node1_id.value, ~~form.node2_id.value, ~~form.route_length.value,];
    }

    dialog.querySelector("#remove_node_connection").addEventListener("click", function() {
        let [node1_id, node2_id] = get_node_ids();

        if (node1_id === -1 || node2_id === -1 || node1_id === node2_id) {
            return;
        }

        router.removeRoute(node1_id, node2_id)

        form.reset();
        dialog.close();
        loop();
    });

    dialog.querySelector("#create_node_connection").addEventListener("click", function() {
        let [node1_id, node2_id, route_length] = get_node_ids();

        if (node1_id === -1 || node2_id === -1 || route_length <= 0) {
            return;
        }

        if (node1_id === node2_id) {
            alert(`No way I will create connection ${node1_id} -> ${node2_id}`)
            return;
        }

        router.addRoute(node1_id, node2_id, route_length);

        form.reset();
        dialog.close();
        loop();
    });

    dialog.querySelector("#manage_connections_dialog_cancel").addEventListener("click", function() {
        loop();
        dialog.close();
    });

    removeOptions(form.node1_id);
    removeOptions(form.node2_id);

    {
        let option = document.createElement("option");
        option.value = "-1";
        option.textContent = "Not selected";

        form.node1_id.add(option.cloneNode(true));
        form.node2_id.add(option.cloneNode(true));
    }

    for (let node of router.nodes) {
        let option = document.createElement("option");
        option.value = node.id;
        option.textContent = node.title;

        form.node1_id.add(option.cloneNode(true));
        form.node2_id.add(option.cloneNode(true));
    }

    dialog.showModal();
}

let remove_node = function() {
    noLoop();
    let dialog = document.getElementById("remove_node_dialog");
    let form = dialog.querySelector("form");

    dialog.querySelector("#remove_node_dialog_confirm").addEventListener("click", function() {
        let node_id = ~~form.node_id.value;

        if (node_id === -1) {
            return;
        }

        router.removeNode(node_id);

        form.reset();
        dialog.close();
        loop();
    });

    dialog.querySelector("#remove_node_dialog_cancel").addEventListener("click", function() {
        loop();
        dialog.close();
    });

    removeOptions(form.node_id);

    {
        let option = document.createElement("option");
        option.value = "-1";
        option.textContent = "Not selected";

        form.node_id.add(option);
    }

    for (let node of router.nodes) {
        let option = document.createElement("option");
        option.value = node.id;
        option.textContent = node.title;

        form.node_id.add(option);
    }

    dialog.showModal();
}

let serialize_graph = function() {
    routes_data.nodes = [];
    routes_data.routes = [];
    for (let node of router.nodes) {
        routes_data.nodes.push({ id: node.id, x: node.x, y: node.y, title: node.title });
    }
    for (let route_key of router.routes.keys()) {
        let [from, to] = route_key.split("_").map(el => ~~el);
        routes_data.routes.push({ from: from, to: to, minutes:  router.routes.get(route_key)})
    }

    let data_text = JSON.stringify(routes_data);
    navigator.clipboard.writeText(data_text).then(
        () => alert("Graph serialized to clipboard")
    ).catch(
        (err) => alert("Error, while serializing graph: " + err.message)
    );
}

let deserialize_graph = function() {
    navigator.clipboard.readText().then(
        text => {
            clear_graph();
            routes_data = JSON.parse(text);
            process_routes_data();
            alert("Graph deserialized");
        }
    ).catch(
        err => alert("Error, while deserializing graph: " + err.message)
    );
}

let format_route_message = function(route, type) {
    let message = "";
    if (route.route.length > 0) {
        message += `Found ${type} route from '${selected_nodes.first.title}' to '${selected_nodes.second.title}'\n`;
        message += `\tTime spend: ${route.ellapsed_time} ms.\n`;
        message += `\tHops: ${route.route.length-1}; `;
        message += `Time: ${route.route_stats.time/60} mins.; `;
        message += `Cost: ${route.route_stats.money} \n`;
        message += `\tID-ROUTE: ${route.route.map(el => `"${el.title}"`).join(" -> ")}\n`;
    }
    else {
        message += `Not found ${type} route from '${selected_nodes.first.title}' to '${selected_nodes.second.title}'\n`;
    }
    return message;
}

let loadData = function(fname) {
    (async () => {
        let response = await fetch(`system/${fname}.json`);
        let jsonData = await response.json();
        routes_data = jsonData;
        process_routes_data()
    })();
}

function setup() {
    canva = createCanvas(screen.width, 500);
    canva.parent("map-tab");

    if (DEBUG) {
        btn_clear_graph = createButton("Clear graph");
        btn_create_node = createButton("Create new node");
        btn_remove_node = createButton("Remove node");
        btn_add_route = createButton("Manages routes");
        btn_serialize_graph = createButton("Serialize graph to clipboard");
        btn_deserialize_graph = createButton("Deserialize graph from clipboard");
    
        btn_clear_graph.mousePressed(clear_graph);
        btn_create_node.mousePressed(create_node);
        btn_remove_node.mousePressed(remove_node);
        btn_add_route.mousePressed(create_route);
        btn_serialize_graph.mousePressed(serialize_graph);
        btn_deserialize_graph.mousePressed(deserialize_graph);
    }

    rectMode(RADIUS);
    strokeWeight(1);
    textFont("Monospace");

    loadData("gways");
}

function draw() {
    processTranslationValues();
    let message = `MP: (${~~mpX},${~~mpY})`;

    background(144, 144, 144);
    translate(width/2 + offX, height/2 + offY);
    scale(scaleFactor, scaleFactor);

    [ mpX, mpY ] = [mouseX - width/2 - offX, mouseY - height/2 - offY];
    mpX /= scaleFactor;
    mpY /= scaleFactor;

    let orphaned = router.nodes.filter(el => el.next.length === 0 && el.prev.length === 0).map(el => el.title);
    if (orphaned.length > 0) {
        message += `\nFound orphaned nodes: ${orphaned.join(", ")}`;
    }

    push();
    stroke(0, 0, 0, 30);
    for (let node of router.nodes) {
        node.showConnections();
    }
    pop();

    push();
    stroke(255);
    strokeWeight(2);
    for (let node of router.nodes) {
        if (node.containsPoint(mpX, mpY)) {
            message += `\nOver node: ${node.title} {id: ${node.id}, at: (${node.x},${node.y})}\n`;
            message += `\tP:${node.prev.length}; N:${node.next.length}`;
            node.showConnections();
        }
    }
    pop();

    if (selected_nodes.second !== null && !selected_nodes.foundRoutes) {
        calculateRoutes().catch(err => { throw err; });
    }

    push();
    strokeWeight(4);
    if (selected_nodes.isUniversal) {
        stroke(255, 144, 255, 200);
        for (let i = 0; i < selected_nodes.fastest_route.route.length - 1; i++) {
            Node.drawConnection(selected_nodes.fastest_route.route[i], selected_nodes.fastest_route.route[i+1]);
        }
    }
    else {
        stroke(255, 0, 0, 100);
        for (let i = 0; i < selected_nodes.fastest_route.route.length - 1; i++) {
            Node.drawConnection(selected_nodes.fastest_route.route[i], selected_nodes.fastest_route.route[i+1]);
        }
        stroke(255, 255, 0, 100);
        for (let i = 0; i < selected_nodes.cheapest_route.route.length - 1; i++) {
            Node.drawConnection(selected_nodes.cheapest_route.route[i], selected_nodes.cheapest_route.route[i+1]);
        }
    }
    pop();

    push();
    for (let node of router.nodes) {
        stroke(255, 140, 0);
        strokeWeight(1);
        if (selected_nodes.first === node) {
            stroke(0, 255, 0);
            strokeWeight(2);
        }
        else if (selected_nodes.second === node) {
            stroke(0, 0, 255);
            strokeWeight(2);
        }
        node.show();
    }
    
    for (let node of router.nodes) {
        stroke(0);
        fill(255);
        text(node.title, node.x+15, node.y);
    }
    pop();

    if (selected_nodes.foundRoutes) {
        message += "\n";
        if (selected_nodes.isUniversal) {
            if (selected_nodes.fastest_route.route.length > 0) {
                message += format_route_message(selected_nodes.fastest_route, "universal");
            }
            else {
                message += "There is no fastest nor cheapest route from ";
                message += `'${selected_nodes.first.title}' to '${selected_nodes.second.title}'\n`;
            }
        }
        else {
            message += format_route_message(selected_nodes.fastest_route, "fastest");
            message += format_route_message(selected_nodes.cheapest_route, "cheapest");
        }
    }

    if (DEBUG) {
        text(message, mpX+5, mpY);
    }
    circle(mpX, mpY, 4);
}

let clearSelectorData = () => {
    selected_nodes.first = null;
    selected_nodes.second = null;
    selected_nodes.fastest_route = {
        route: [],
        route_stats: {},
        ellapsed_time: 0,
    };
    selected_nodes.cheapest_route.route = {
        route: [],
        route_stats: {},
        ellapsed_time: 0,
    };
    selected_nodes.isUniversal = false;
    selected_nodes.foundRoutes = false;
}

function mouseReleased() {
    if (!DEBUG) {
        return;
    }
    if (mouseButton === LEFT) {
        for (let node of router.nodes) {
            if (node.containsPoint(mpX, mpY)) {

                if (selected_nodes.first === null) {
                    selected_nodes.first = node;
                }
                else if (selected_nodes.first === node) {
                    clearSelectorData();
                }
                else if (selected_nodes.second === null) {
                    selected_nodes.second = node;
                }
                else if (selected_nodes.second === node) {
                    let ofn = selected_nodes.first;
                    clearSelectorData();
                    selected_nodes.first = ofn;
                }
                break;
            }
        }
    }
    else if (mouseButton === CENTER) {
        if (selected_nodes.first !== null && selected_nodes.second === null) {
            for (let node of router.nodes) {
                if (node.containsPoint(mpX, mpY)) {
                    let len = ~~prompt("Length of new route (default: 4)", "4");
                    if (len <= 0) {
                        len = 4;
                    }

                    router.addRoute(selected_nodes.first.id, node.id, cm(len));
                    break;
                }
            }
        }
        else if (selected_nodes.first == null) {
            let wasOverNode = false;
            for (let node of router.nodes) {
                if (node.containsPoint(mpX, mpY)) {
                    wasOverNode = true;
                }
            }
            if (!wasOverNode) {
                let title = prompt("New node title", "");
                if (title.length === 0) {
                    return;
                }

                let new_id = router.nodes.length;
                let last_node = router.nodes.slice(-1)[0];
                if (last_node !== undefined) {
                    new_id = last_node.id + 1;
                }

                router.addNode(new Node(new_id, mpX, mpY, pointSize, title));
            }
        }
    }
    else if (mouseButton === RIGHT) {
        // TODO: ???
    }
}
