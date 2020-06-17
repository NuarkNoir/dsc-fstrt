'use strict';

class Node {
    // конструктор объекта
    // id - ID в системе
    // (x, y) - координаты положения на канвасе
    // d - диаметр вершины при рисовании
    // title - название вершины в системе
    constructor(id, x, y, d, title) {
        console.assert(id !== undefined);
        this.id = id;
        this.x = x;
        this.y = y;
        this.size = d;
        this.title = title;
        this.next = [];
        this.cost = Infinity;
        this.prev = [];
    }

    // добавляет потомка child данной вершине
    addChild(child) {
        child.prev.push(this);
        this.next.push(child);
    }

    // убирает потомка child данной вершины
    removeChild(child) {
        let that = this;
        child.prev = child.prev.filter(el => el !== that);
        this.next = this.next.filter(el => el !== child);
    }

    // рисует вершину на канвасе в виде точки
    show() {
        circle(this.x, this.y, this.size)
    }

    // рисует соединения между данной точкой и потомками
    showConnections() {
        for (let prevNode of this.next) {
            Node.drawConnection(prevNode, this);
        }
    }

    // исчет расстояние между вершиной и некоторой точкой с координатой (x,y)
    distToPoint(x, y) {
        return createVector(this.x, this.y).dist(createVector(x, y));
    }

    // проверяет, находится ли точка с координатой (x,y) в пределах
    // нарисованной точки
    containsPoint(x, y) {
        return this.distToPoint(x,y) < this.size / 2;
    }

    // статический метод, рисующий соединение между двумя вершинами
    static drawConnection(node1, node2) {
        line(node1.x, node1.y, node2.x, node2.y);
    }
}