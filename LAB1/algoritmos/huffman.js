class Huffman {
    constructor() {
      this.root = null;
    }
  
    encode(data) {
      const frequencyTable = this.buildFrequencyTable(data);
      this.buildHuffmanTree(frequencyTable);
      return this.generateEncodedData(data);
    }
  
    decode(encodedData) {
      return this.generateDecodedData(encodedData);
    }
  
    buildFrequencyTable(data) {
      const frequencyTable = {};
      for (const c of data) {
        frequencyTable[c] = (frequencyTable[c] || 0) + 1;
      }
      return frequencyTable;
    }
  
    buildHuffmanTree(frequencyTable) {
      const queue = Object.keys(frequencyTable).map(
        c => new Node(c, null, null, frequencyTable[c])
      ).sort((a, b) => a.frequency - b.frequency);
  
      while (queue.length > 1) {
        const left = queue.shift();
        const right = queue.shift();
        const parentFrequency = left.frequency + right.frequency;
        const parent = new Node(null, left, right, parentFrequency);
  
        queue.push(parent);
        queue.sort((a, b) => a.frequency - b.frequency);
      }
  
      this.root = queue.shift();
    }
  
    generateEncodedData(data) {
      const map = {};
      this.buildMap(this.root, "", map);
  
      return data.split('').map(c => map[c]).join('');
    }
  
    buildMap(node, prefix, map) {
      if (node.isLeaf) {
        map[node.value] = prefix;
        return;
      }
  
      this.buildMap(node.left, prefix + '0', map);
      this.buildMap(node.right, prefix + '1', map);
    }
  
    generateDecodedData(encodedData) {
      let currentNode = this.root;
      let decodedData = '';
  
      for (const bit of encodedData) {
        currentNode = bit === '0' ? currentNode.left : currentNode.right;
  
        if (currentNode.isLeaf) {
          decodedData += currentNode.value;
          currentNode = this.root;
        }
      }
  
      return decodedData;
    }
  }
  
  class Node {
    constructor(value, left, right, frequency) {
      this.value = value;
      this.left = left;
      this.right = right;
      this.frequency = frequency;
      this.isLeaf = !left && !right;
    }
  }
  
  module.exports = Huffman;
  