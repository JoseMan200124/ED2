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
    constructor(name, dpi, dateBirth, address, companies = {}, recruiter = '') {
        this.name = name;
        this.dpi = dpi;
        this.dateBirth = dateBirth;
        this.address = address;
        this.companies = companies;
        this.key = `${name.toLowerCase()}-${dpi}`;
        this.recommendations = [];
        this.recommendationsDecoded = [];
        this.conversations = [];
        this.recruiter = recruiter;

    }
    encryptConversation(conversation) {
        let iv = crypto.randomBytes(IV_LENGTH);
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(conversation);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    generateKeyPair() {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }
    encryptWithPublicKey(data, publicKey) {
        const encryptedData = crypto.publicEncrypt(
            { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
            Buffer.from(data)
        );
        return encryptedData.toString('base64');
    }

    decryptWithPrivateKey(encryptedData) {
        const decryptedData = crypto.privateDecrypt(
            { key: this.privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
            Buffer.from(encryptedData, 'base64')
        );
        return decryptedData.toString();
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

    compress(data) {
        return zlib.deflateSync(data).toString('base64');
    }

    decompress(compressedData) {
        return zlib.inflateSync(Buffer.from(compressedData, 'base64')).toString();
    }
}

class Database {
    constructor() {
        this.data = [];
        this.dpiHuffman = new Huffman();
        this.recommendationHuffman = new Huffman();
        this.companyHuffmans = {};
    }
    testHuffman() {
        const testText = "Tempora nihil dolor earum molestias. Deserunt nostrum amet doloremque qui et. Velit quia repellendus.\n" +
            "Architecto optio maiores ipsum culpa. Quos optio incidunt omnis amet tenetur eum ut incidunt aut. Maiores atque omnis quis nulla odio.\n" +
            "Enim commodi reiciendis qui et. Alias odit ipsa quibusdam cupiditate natus. Voluptate quibusdam possimus aut iusto magnam. Sint nobis adipisci dolores nobis est atque et expedita quibusdam.\n" +
            "Totam et perferendis vitae explicabo nemo est vel. Aut earum distinctio quibusdam totam autem temporibus molestiae temporibus sed. Amet explicabo eveniet inventore quam. Earum soluta itaque natus.\n" +
            "Optio porro nesciunt sint. Praesentium minus voluptatem sit. Quod dicta ea hic quis non. Officia mollitia ut inventore adipisci sit amet quas aut. Soluta sunt autem perspiciatis rerum porro et ut quia. Est sed voluptatem distinctio ut qui.";
        const encoded = this.recommendationHuffman.encode(testText);
        const decoded = this.recommendationHuffman.decode(encoded);

        console.log("Original:", testText);
        console.log("Codificado:", encoded);
        console.log("Decodificado:", decoded);
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
            const person = new Person(data.name, data.dpi, data.datebirth, data.address, data.companies, data.recruiter);

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
    console.log('6. Seleccionar reclutador y compañía y validar identidad');
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
                rl.question('Ingrese el reclutador: ', (reclutador) => {
                    rl.question('Ingrese la compañía: ', (compania) => {
                        validateIdentity(reclutador, compania, db);
                        showMenu();
                    });
                });
                break;
            case '7':
                rl.close();
                break;
            default:
                showMenu();
                break;
        }
    });
}

function validateIdentity(reclutador, compania, db) {
    const message = 'palabra clave'; // Esto puede ser cualquier palabra clave que desees usar
    let isValid = false;
    db.data.forEach(person => {
        if (person.recruiter === reclutador && Object.keys(person.companies).includes(compania)) {
            const encryptedMessage = person.encryptWithPublicKey(message, person.publicKey);
            const decryptedMessage = person.decryptWithPrivateKey(encryptedMessage);
            if (decryptedMessage === message) {
                isValid = true;
            }
        }
    });
    if (isValid) {
        console.log('Identidad validada exitosamente.');
    } else {
        console.log('Identidad no pudo ser validada.');
    }
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

processCsvFile('LAB1\\input_lab4.csv', db, () => {
    db.data.forEach(person => {
        db.loadRecommendations(person);
        db.loadConversations(person);
    });
    showMenu();
});