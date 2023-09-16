class ArithmeticCompression {
    constructor() {
      this.symbolTable = {};
    }
  
    // Build a frequency table
    buildFrequencyTable(data) {
      for (const symbol of data) {
        this.symbolTable[symbol] = (this.symbolTable[symbol] || 0) + 1;
      }
  
      let sum = 0;
      for (const symbol in this.symbolTable) {
        sum += this.symbolTable[symbol];
      }
  
      // Convert frequencies to probabilities
      for (const symbol in this.symbolTable) {
        this.symbolTable[symbol] /= sum;
      }
    }
  
    // Encode the data
    encode(data) {
      this.buildFrequencyTable(data);
  
      let low = 0;
      let high = 1;
  
      for (const symbol of data) {
        const range = high - low;
        const symbolProbability = this.symbolTable[symbol];
  
        high = low + range * symbolProbability;
  
        let totalProb = 0;
        for (const s in this.symbolTable) {
          if (s === symbol) break;
          totalProb += this.symbolTable[s];
        }
  
        low = low + range * totalProb;
      }
  
      return (high + low) / 2;
    }
  
    // This is a very basic decode function. In a full implementation,
    // you'd use the compressed data to do the decoding.
    decode(encodedValue, length) {
      let low = 0;
      let high = 1;
      let data = "";
  
      for (let i = 0; i < length; i++) {
        const range = high - low;
  
        for (const symbol in this.symbolTable) {
          const symbolProbability = this.symbolTable[symbol];
  
          const newHigh = low + range * symbolProbability;
  
          let totalProb = 0;
          for (const s in this.symbolTable) {
            if (s === symbol) break;
            totalProb += this.symbolTable[s];
          }
  
          const newLow = low + range * totalProb;
  
          if (encodedValue > newLow && encodedValue < newHigh) {
            data += symbol;
            low = newLow;
            high = newHigh;
            break;
          }
        }
      }
  
      return data;
    }
  }
  
  module.exports = ArithmeticCompression;
  