const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');

class Person {
    constructor(name, dpi, dateBirth, address) {
        this.name = name;
        this.dpi = dpi;
        this.dateBirth = dateBirth;
        this.address = address;
        this.key = `${name}-${dpi}`;
    }
}

class Database {
    constructor() {
        this.data = [];
    }

    search(k) {
        return this.data.find(person => person.key === k);
    }

    insert(person) {
        const index = this.data.findIndex(p => p.key === person.key);
        if (index !== -1) {
            this.data[index] = person;
        } else {
            this.data.push(person);
        }
    }

    delete(k) {
        const index = this.data.findIndex(person => person.key === k);
        if (index !== -1) {
            this.data.splice(index, 1);
        }
    }

    searchByName(name) {
        return this.data.filter(person => person.name === name);
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
            const person = new Person(data.name, data.dpi, data.datebirth, data.address);

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
    console.log('2. Salir');
    rl.question('Elija una opción: ', (option) => {
        switch (option) {
            case '1':
                searchByName();
                break;
            case '2':
                console.log('Saliendo...');
                rl.close();
                break;
            default:
                console.log('Opción no válida.');
                showMenu();
        }
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

processCsvFile('input.csv', db, () => {
    generateJSONL(db);
    showMenu();
});
