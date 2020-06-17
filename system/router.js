'use strict';

class Router {
    // конструктор объекта
    // basePrice - стоимость одной пересадки
    constructor(basePrice) {
        this.basePrice = basePrice;
        this.routes = new Map();
        this.nodes = [];

        this.onNodeAdd = [];
        this.onNodeRemove = [];
    }

    // функция добавляет вершину в роутер
    addNode(node) {
        this.nodes.push(node);

        this.notifyAddListeners(node);
    }

    // убирает вершину из роутера, попутно избавляясь от путей в и из вершины
    removeNode(node_id) {
        let node = this.nodes.find(el => el.id === node_id);

        for (let next_node of node.next) {
            this.removeRoute(node.id, next_node.id);
        }
        for (let prev_node of node.prev) {
            this.removeRoute(prev_node.id, node.id);
        }

        this.nodes = this.nodes.filter(el => el !== node);

        this.notifyRemoveListeners(node);
    }

    // выполняет поиск вершины в роутере по её ID
    getNodeById(node_id) {
        return this.nodes.find(el => el.id === node_id);
    }

    // уведомляет всех "слушателей" события добавления вершины в роутер
    notifyAddListeners(node) {
        this.onNodeAdd.forEach(action => {
            try {
                if (action instanceof Function) {
                    action(node);
                }
                else {
                    console.error(`'Not a function: ${node}'`);
                }
            }
            catch (err) {
                console.error(err);
            }
        });
    }

    // уведомляет всех "слушателей" события удаления вершины из роутера
    notifyRemoveListeners(node) {
        this.onNodeRemove.forEach(action => {
            try {
                if (action instanceof Function) {
                    action(node);
                }
                else {
                    console.error(`'Not a function: ${node}'`);
                }
            }
            catch (err) {
                console.error(err);
            }
        });
    }

    // добавляет "слушателей" событий удаления ил добавления вершины
    addListeners(nodeAddListener, nodeRemoveListener) {
        if (nodeAddListener instanceof Function) {
            this.onNodeAdd.push(nodeAddListener);
        }

        if (nodeRemoveListener instanceof Function) {
            this.onNodeRemove.push(nodeRemoveListener);
        }
    }

    // "перезагружает" роутер, стирая все вершины и пути
    rebootRouter() {
        this.routes = new Map();
        this.nodes = [];
    }

    // проверяет наличие пути между двумя вершинами по их ID
    hasRoute(node1_id, node2_id) {
        return this.routes.has(`${node1_id}_${node2_id}`);
    }

    // убирает путь между двумя вершинами
    removeRoute(node1_id, node2_id) {
        let node1_idx = this.nodes.findIndex(el => el.id === node1_id);
        let node2_idx = this.nodes.findIndex(el => el.id === node2_id);

        this.routes.delete(`${node1_id}_${node2_id}`);
        this.nodes[node1_idx].removeChild(this.nodes[node2_idx]);
    }

    // добавляет путь между двумя вершинами
    addRoute(node1_id, node2_id, length) {
        let node1_idx = this.nodes.findIndex(el => el.id === node1_id);
        let node2_idx = this.nodes.findIndex(el => el.id === node2_id);

        if (!this.hasRoute(node1_id, node2_id)) {
            this.nodes[node1_idx].addChild(this.nodes[node2_idx]);
        }
        this.routes.set(`${node1_id}_${node2_id}`, length);
    }

    // получает стоимость пути между двумя вершинами
    getRouteCost(node1_id, node2_id) {
        return this.routes.get(`${node1_id}_${node2_id}`);
    }

    // считает статистику пути по списку вершин
    calcFullRouteStats(routes_arr) {
        let time = 0;
        let money = 0;
        for (let i = 0; i < routes_arr.length - 1; i++) {
            time += this.getRouteCost(routes_arr[i].id, routes_arr[i+1].id);
            money += this.basePrice;
        }
        return { time, money };
    }

    // реализация алгоритма Дейкстры
    findRoute(start_node, end_node, calc_cost) {
        let visited = {};
        let traverse = (node_from, node_to) => {
            if (visited[node_to.id] === true) {
                return;
            }

            let pnc = calc_cost(node_from, node_to) + node_from.cost;

            if (node_to.cost !== Infinity) {
                if (visited[node_from.id] < pnc) {
                    visited[node_from.id] = pnc;
                }
            }
            else {
                node_to.cost = pnc;
            }

            visited[node_from.id] = true;

            for (let ntnode of node_to.next) {
                traverse(node_to, ntnode);
            }
        }

        start_node.cost = 0;

        for (let nnode of start_node.next) {
            traverse(start_node, nnode);
        }

        let current_node = end_node;
        let path = [current_node];
        let i = 0;
        do {
            current_node.prev.sort((l, r) => l.cost - r.cost);
            let minimal_node = current_node.prev[0];
            for (let j = 0; j < current_node.prev.length; j++) {
                if (current_node.prev[i] === end_node || minimal_node.cost < current_node.prev[j]) {
                    if (path.find(el => el === current_node.prev[i])) {
                        continue;
                    }
                    minimal_node = current_node.prev[j];
                    if (minimal_node === end_node) {
                        break;
                    }
                }
            }

            path.unshift(minimal_node);
            current_node = minimal_node;
        } while (current_node.prev.length > 0 && current_node !== start_node && i++ < this.nodes.length)

        if (path.length > 1 && path[0] !== start_node) {
             return [];
        }

        return path;
    }

    // поиск скорейшего пути алгоритмом Дейкстры
    findFastestRoute(start_node, end_node) {
        this.nodes.forEach(el => el.cost = Infinity);
        return this.findRoute(
            start_node, end_node,
            (node_from, node_to) => this.getRouteCost(node_from.id, node_to.id)
        );
    }

    // поиск наиболее дешёвого пути алгоритмом Дейкстры
    findCheapestRoute(start_node, end_node) {
        this.nodes.forEach(el => el.cost = Infinity);
        return this.findRoute(
            start_node, end_node,
            () => 1
        );
    }
}