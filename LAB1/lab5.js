const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');
const zlib = require('zlib');
const crypto = require('crypto');
const Huffman = require('./algoritmos/huffman');
const CompresionAritmetica = require('./algoritmos/compresion_aritmetica');
const path = require('path');
const ENCRYPTION_KEY2 = crypto.randomBytes(32).toString('hex');
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

class Person {
    constructor(name, dpi, dateBirth, address, companies = {}, recluiter) {
        this.name = name;
        this.dpi = dpi;
        this.dateBirth = dateBirth;
        this.address = address;
        this.companies = companies;
        this.key = `${name.toLowerCase()}-${dpi}`;
        this.recommendations = [];
        this.recommendationsDecoded = [];
        this.conversations = [];
        this.recluiter = recluiter;
        this.encryption = new AsymmetricEncryption();
        this.uniqueKeyword = `${dpi}-estructuras`;
    }
    encryptConversation(conversation) {
        let iv = crypto.randomBytes(IV_LENGTH);
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(conversation);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }


    decryptConversation(encryptedData) {
        let parts = encryptedData.split(':');
        let iv = Buffer.from(parts.shift(), 'hex');
        let encryptedText = Buffer.from(parts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY2, 'hex'), iv);
        console.log(decipher);
        let decrypted = decipher.update(encryptedText);
        console.log(decrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        console.log(decrypted);
        return decrypted.toString();
    }
}
class AsymmetricEncryption {
    constructor() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    encrypt(data) {
        const encryptedData = crypto.publicEncrypt(this.publicKey, Buffer.from(data));
        return encryptedData.toString('base64');
    }

    decrypt(encryptedData) {
        const decryptedData = crypto.privateDecrypt(this.privateKey, Buffer.from(encryptedData, 'base64'));
        return decryptedData.toString();
    }
}

class Database {
    constructor() {
        this.data = [];
        this.dpiHuffman = new Huffman();
        this.recommendationHuffman = new Huffman();
        this.companyHuffmans = {};
    }

    getCompanyHuffman(companyName) {
        if (!this.companyHuffmans[companyName]) {
            this.companyHuffmans[companyName] = new Huffman();
        }
        return this.companyHuffmans[companyName];
    }
    encodeDPI(dpi){
        return this.dpiHuffman.encode(dpi);
    }
    decodeDPI(encodedDPI){
        return this.dpiHuffman.decode(encodedDPI);
    }
    validateIdentity(person) {
        const encryptedWord = person.encryption.encrypt(person.uniqueKeyword);
        return person.encryption.decrypt(encryptedWord) === person.uniqueKeyword;
    }

    search(k) {
        const keyLower = k.toLowerCase();

        const foundPerson = this.data.find(person => {
            const personKeyLower = person.dpi;

            return personKeyLower === keyLower;
        });

        return foundPerson;
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

    displayByName(nameKey) {
        const person = this.data.find(p => p.key === nameKey);
        if (person) {
            console.log(`Nombre: ${person.name}`);
            console.log(`DPI: ${person.dpi}`);
            console.log(`Fecha de nacimiento: ${person.dateBirth}`);
            console.log(`Dirección: ${person.address}`);
            Object.keys(person.companies).forEach(company => {
                console.log(`Empresa: ${company}`);
                console.log(`Función: ${person.companies[company]}`);
            });
        } else {
            console.log(`No se encontró a la persona con nombre clave: ${nameKey}`);
        }
    }
    displayRecommendations(dpi) {
        const person = this.search(dpi);
        if (person && person.recommendations.length > 0) {
            console.log(`Cartas de recomendación para ${person.name}:`);
            person.recommendationsDecoded.forEach((encodedRec, index) => {
                console.log(`Carta #${index + 1}:`);
                console.log(encodedRec);

            });
        } else {
            console.log(`No se encontraron cartas de recomendación para el DPI ${dpi}.`);
        }
    }
    displayConversations(dpi) {
        const person = this.search(dpi);
        if (person && person.conversations.length > 0) {
            console.log(`Conversaciones para ${person.name}:`);
            person.conversations.forEach((encryptedConv, index) => {
                console.log(`Conversación #${index + 1}:`);
                console.log(person.decryptConversation(encryptedConv));
            });
        } else {
            console.log(`No se encontraron conversaciones para el DPI ${dpi}.`);
        }
    }
    loadRecommendations(person) {
        let i = 1;
        while (true) {
            const filePath = path.join(__dirname, `inputs/cartas/REC-${person.dpi}-${i}.txt`);
            if (fs.existsSync(filePath)) {

                const content = fs.readFileSync(filePath, 'utf8');
                const normalizedContent = content.replace(/\r\n/g, '\n');
                const encoded = this.recommendationHuffman.encode(normalizedContent);
                const decoded = this.recommendationHuffman.decode(encoded);
                person.recommendations.push(encoded);
                person.recommendationsDecoded.push(decoded);
                i++;
            } else {
                break;
            }
        }
    }
    loadConversations(person) {
        let i = 1;
        while (true) {
            const filePath = path.join(__dirname, `inputs/conversaciones/CONV-${person.dpi}-${i}.txt`);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const encryptedContent = person.encryptConversation(content);
                person.conversations.push(encryptedContent);
                i++;
            } else {
                break;
            }
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

            const person = new Person(data.name, data.dpi, data.datebirth, data.address, data.companies, data.recluiter);
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
    console.log('3. Mostrar cartas de recomendación por DPI');
    console.log('4. Mostrar conversaciones cifradas por DPI');
    console.log('5. Mostrar conversaciones descifradas por DPI');
    console.log('6. Pruebas de llave pública y privada');
    console.log('7. Salir');
    rl.question('Elija una opción: ', (option) => {
        switch (option) {
            case '1':
                rl.question('Ingrese el nombre y el DPI (formato "nombre-dpi"): ', (nameKey) => {
                    db.displayByName(nameKey);
                    showMenu();
                });
                break;
            case '2':
                showMenu();
                break;
            case '3':
                rl.question('\nIngrese el DPI para buscar cartas de recomendación: ', (dpi) => {
                    db.displayRecommendations(dpi);
                    showMenu();
                });
                break;
            case '4':
                rl.question('\nIngrese el DPI para buscar conversaciones cifradas: ', (dpi) => {
                    const person = db.search(dpi);
                    if (person && person.conversations.length > 0) {
                        console.log(`Conversaciones cifradas para ${person.name}:`);
                        person.conversations.forEach((encryptedConv, index) => {
                            console.log(`Conversación cifrada #${index + 1}:`);
                            console.log(encryptedConv);
                        });
                    } else {
                        console.log(`No se encontraron conversaciones cifradas para el DPI ${dpi}.`);
                    }
                    showMenu();
                });
                break;
            case '5':
                rl.question('\nIngrese el DPI para buscar conversaciones descifradas: ', (dpi) => {
                    db.displayConversations(dpi);
                    showMenu();
                });
                break;
            case '6':
                rl.question('Ingrese el DPI de la persona: ', (dpi) => {
                    const person = db.search(dpi);
                    if (person) {
                        rl.question('Ingrese el nombre del reclutador: ', (recruiterName) => {
                            if (person.recluiter === recruiterName) {
                                rl.question('Ingrese el nombre de la compañía: ', (companyName) => {
                                    if (person.companies[companyName]) {
                                        const isIdentityValid = db.validateIdentity(person);
                                        if (isIdentityValid) {
                                            console.log('Prueba exitosa: La palabra encriptada y luego desencriptada coincide con la original.');
                                            showMenu();
                                        } else {
                                            console.log('Prueba fallida: La palabra desencriptada no coincide con la original.');
                                            showMenu();
                                        }
                                    } else {
                                        console.log('La compañía no se encuentra registrada para esta persona.');
                                        showMenu();
                                    }
                                });
                            } else {
                                console.log('El nombre del reclutador no coincide con el registrado.');
                                showMenu();
                            }
                        });
                    } else {
                        console.log('No se encontró a la persona con el DPI proporcionado.');
                        showMenu();
                    }
                });
                break;
                default:
                showMenu();
                break;
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
                rl.question('Ingrese el DPI a codificar: ', (dpi) => {
                    const encodedDPI = db.encodeDPI(dpi);
                    showMenu();
                });
            } else if (ft === 'decodificación') {
                rl.question('Ingrese el DPI codificado a decodificar: ', (encodedDPI) => {
                    const decodedDPI = db.decodeDPI(encodedDPI);
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

processCsvFile('LAB1\\input.csv', db, () => {
    db.data.forEach(person => {
        db.loadRecommendations(person);
        db.loadConversations(person);
    });
    showMenu();
});