const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');
const Huffman = require('./algoritmos/huffman');
const CompresionAritmetica = require('./algoritmos/compresion_aritmetica');

class Person {
    constructor(name, dpi, dateBirth, address, companies = {}) {
        this.name = name;
        this.dpi = dpi;
        this.dateBirth = dateBirth;
        this.address = address;
        this.companies = companies;
        this.key = `${name.toLowerCase()}-${dpi}`;

    }
}

class Database {
    constructor() {
        this.data = [];
        this.huffman = new Huffman();
        this.companyHuffmans = {};
    }
    getCompanyHuffman(companyName) {
        if (!this.companyHuffmans[companyName]) {
            this.companyHuffmans[companyName] = new Huffman();
        }
        return this.companyHuffmans[companyName];
    }
    encodeDPI(dpi){
        return this.huffman.encode(dpi);
    }
    decodeDPI(encodedDPI){
        return this.huffman.decode(encodedDPI);
    }

    search(k) {
        const keyLower = k.toLowerCase();
        return this.data.find(person => person.key.toLowerCase() === keyLower);
    }

    insert(person) {
        const index = this.data.findIndex(p => p.key === person.key);

        // Codificando DPI usando Huffman para cada empresa
        const encodedCompanies = {};
        person.companies.forEach(company => {
            const huffman = this.getCompanyHuffman(company);
            const encodedDPI = huffman.encode(person.dpi);
            encodedCompanies[company] = encodedDPI;
        });

        person.companies = encodedCompanies;

        if (index !== -1) {
            this.data[index] = person;
        } else {
            this.data.push(person);
        }
    }


    delete(k) {
        const keyLower = k.toLowerCase();
        const index = this.data.findIndex(person => person.key.toLowerCase() === keyLower);
        if (index !== -1) {
            this.data.splice(index, 1);
        }
    }

    searchByName(name) {
        const nameLower = name.toLowerCase();
        return this.data.filter(person => person.name.toLowerCase() === nameLower);
    }


    toJSONL() {
        return this.data.map(person => JSON.stringify(person)).join('\n');
    }

}

const processCsvFile = (filePath, db, callback) => {
    fs.createReadStream(filePath)
        .pipe(csv({
            separator: ';',
            headers: ['operation', 'data']
        }))
        .on('data', (row) => {
            if (!row.data) {
                console.error('Entrada mal formada encontrada:', row);
                return;
            }

            const data = JSON.parse(row.data);
            const person = new Person(data.name, data.dpi, data.datebirth, data.address, data.companies);

            switch (row.operation) {
                case 'INSERT':
                    db.insert(person);
                    console.log('Inserted:', person);
                    break;
                case 'DELETE':
                    db.delete(`${data.name}-${data.dpi}`);
                    console.log('Deleted:', `${data.name}-${data.dpi}`);
                    break;
                case 'PATCH':
                    db.insert(person);  
                    console.log('patch:', person);
                    break;
            }
        })
        .on('end', () => {
            console.log('Se procesaron todos los datos.');
            callback();
        });
};

function generateJSONL(db) {
    const output = db.toJSONL();
    fs.writeFileSync('output.jsonl', output);
    console.log('Archivo output.jsonl generado.');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showMenu() {
    console.log('\n===== Menú =====');
    console.log('1. Buscar por nombre');
    console.log('2. Seleccionar empresa y función');
    console.log('3. Salir');
    rl.question('Elija una opción: ', (option) => {
        switch (option) {
            case '1':
                searchByName();
                break;
            case '2':
                selectCompanyAndFunction();
                break;
            case '3':
                console.log('Saliendo...');
                rl.close();
                break;
            default:
                console.log('Opción no válida.');
                showMenu();
        }
    });
}
function searchByEncodedDPI(){
    rl.question('\nIngrese el DPI codificado a buscar: ', (encodedDPI) =>{
        const decodedDPI = db.decodeDPI(encodedDPI);
        const person = db.search(decodedDPI);
        if(person){
            console.log(`Resultados para ${encodedDPI}:`);
            console.log(`Nombre: ${person.name}, DPI: ${person.dpi}, Fecha de nacimiento: ${person.dateBirth}, Dirección: ${person.address}`);
        }else{
            console.log(`No se encontraron resultados para ${encodedDPI}.`);

        }
    })
}
function selectCompanyAndFunction() {
    rl.question('Ingrese el nombre de la empresa: ', (company) => {
        rl.question('Seleccione la función a realizar (Codificación/Decodificación): ', (functionType) => {
            const ft = functionType.toLowerCase();

            if (ft === 'codificación') {
                // Lógica adicional basada en la empresa
                rl.question('Ingrese el DPI a codificar: ', (dpi) => {
                    const encodedDPI = db.encodeDPI(dpi);
                    console.log(`DPI codificado: ${encodedDPI}`);
                    showMenu();
                });
            } else if (ft === 'decodificación') {
                // Lógica adicional basada en la empresa
                rl.question('Ingrese el DPI codificado a decodificar: ', (encodedDPI) => {
                    const decodedDPI = db.decodeDPI(encodedDPI);
                    console.log(`DPI decodificado: ${decodedDPI}`);
                    showMenu();
                });
            } else {
                console.log('Tipo de función no válida. Por favor, ingrese "Codificación" o "Decodificación".');
                selectCompanyAndFunction();
            }
        });
    });
}
function searchByName() {
    rl.question('\nIngrese el nombre a buscar: ', (name) => {
        const results = db.searchByName(name);
        if (results.length > 0) {
            console.log(`Resultados para ${name}:`);
            results.forEach(person => {
                console.log(`Nombre: ${person.name}, DPI: ${person.dpi}, Fecha de nacimiento: ${person.dateBirth}, Dirección: ${person.address}`);
            });
        } else {
            console.log(`No se encontraron resultados para ${name}.`);
        }
        showMenu(); 
    });
}

const db = new Database();

processCsvFile('input_lab4.csv', db, () => {
    generateJSONL(db);
    showMenu();
});