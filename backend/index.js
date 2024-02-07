const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
// npm install cors
const cors = require('cors');
// npm install multer
const multer = require('multer');
// npm install morgan
const morgan = require('morgan')
const path = require('path')
// npm install md5
// const md5 = require('md5');
// npm install crypto
const crypto = require('crypto')

// npm i swagger-jsdoc swagger-ui-express
const swaggerUI = require('swagger-ui-express');
// const swaggerJsDoc = require('swagger-jsdoc');
const yaml = require('yamljs');
const swaggerDocument = yaml.load('./gsa_apidoc.yaml');

const PDF = require('pdfkit-construct');

// const swaggerSpec = {
//     definition: {
//         openapi: '3.0.3',
//         info: {
//             title: 'API GymSenApp',
//             description: 'La API del proyecto GymSenApp integra un conjunto de elementos que crean el entorno propicio para el correcto funcionamiento de este elemento clave para el despliegue de la aplicación.\n\nPara complementar el desarrollo de la API fue creada la presente documentación con Swagger, sirviendo de corroboración del correcto funcionamiento de la API y de los elementos que la componen.\n\n_Dicho esto, pasemos a la documentación_',
//             version: '1.0.0',
//         },
//         servers: [
//             {
//                 url: 'http://localhost:9300/'
//             },
//         ],
//     },
//     apis: ['./index.js'],
// };




const app = express()

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    next()
})

// Middlewares
app.use(cors({origin:"*"}));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(
    '/api-docs',
    swaggerUI.serve,
    swaggerUI.setup(swaggerDocument)
);

// encrypt
const algorithm = "aes-256-cbc";
const initVector = crypto.randomBytes(16);
const SecurityKey = crypto.randomBytes(32);

const PUERTO = 9300

const conexion = mysql.createConnection(
    
    /* Conexión con base de datos como servicio*/
    
    // {
    //     host:'dbgsammo.helioho.st',
    //     port:3306,
    //     database:'mmo_bdgymsenapp',
    //     user:'mmo_user',
    //     password:'mn4X9d!46'
    // }

    /* Conexión con base de datos local */
    {
        host:'localhost',
        port:3306,
        database:'bd_gymsenapp',
        user:'root',
        password:''
    }
)

app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en el puerto ${PUERTO}`);
})

conexion.connect(error => {
    if(error) throw error
    console.log('Conexión exitosa a la base de datos');
})


app.get('/', (req, res) => {
    res.send('API')
})




// Tipos de usuarios

app.get('/tipos_usuarios', (req, res) => {
    const query = `SELECT * FROM tipos_usuarios`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})



// Antecedentes

app.get('/antecedentes', (req, res) => {
    const query = `SELECT * FROM anteced_salud`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


// Validación existencia correo registro

app.post('/validar_correo', (req, res) => {
    let { id_user, correo_sena_user } = req.body

    const query = `SELECT * FROM usuarios WHERE correo_sena_user='${correo_sena_user}' AND estado_user=1`
        conexion.query(query, (error, resultado) => {
            if(error) {
                return res.json('Error')
            }
            else {
                if (resultado.length == 0) {
                    
                    const query_id = `SELECT * FROM usuarios WHERE id_user=${id_user}`
                    conexion.query(query_id, (error, resultado_id) => {
                        if(error){
                            return res.json('Error')
                        }
                        else{
                            if (resultado_id.length == 0) {
                                return res.json('Disponible')
                            }
                            else {
                                return res.json('El número de identificación digitado ya existe en nuestro sistema')
                            }
                        }
                    })
                }
                else {
                    return res.json('El correo electrónico ya existe en nuestro sistema. Por favor, inténtelo con otro')
                }
            }
        })
})

// Validacion para recuperar la constraseña

app.post('/validar_rec_contrasena', (req, res) => {
    let {
        id_user,correo_sena_user
    } = req.body

    const query = `SELECT * FROM usuarios WHERE id_user='${id_user}' AND correo_sena_user='${correo_sena_user}' AND estado_user=1`
        conexion.query(query, (error, resultado) => {
            if(error) {
                res.json('Ha ocurrido un error. Por favor, inténtelo nuevamente')
            }
            else {
                if (resultado.length == 1) {
                    return res.json('Se encontró')
                }
                else {
                    return res.json('Alguno de los datos ingresados no coincide con los datos existentes en el sistema. Por favor, inténtelo de nuevo')
                }
            }
        })
})

app.put('/validar_rec_contrasena/:id_user', (req, res) => {
    const { id_user } = req.params
    let {
        contrasena
    } = req.body

    // contrasena = md5(contrasena)
    const cipher = crypto.createCipheriv(algorithm,SecurityKey, initVector)
    let contrasen = cipher.update(contrasena, "utf-8", "hex") + cipher.final('hex');

    const query = `UPDATE usuarios SET contrasena='${contrasen}' WHERE id_user=${id_user}`
    conexion.query(query, (error) => {
        if(error) return console.error(error.message)

        res.json(`Se actualizó correctamente la contraseña`)
    })
})



// Registro

app.post('/registrarse', (req, res) => {
    let {
        id_user,nom1_user,nom2_user,ape1_user,ape2_user,correo_sena_user,contrasena,fk_anteced_salud_sel,anteced_salud_inp
    } = req.body

    if (nom2_user=="" || nom2_user=="ninguno" || nom2_user=="no" || nom2_user=="no tengo"){
        nom2_user='';
    }
    if (ape2_user=="" || ape2_user=="ninguno" || ape2_user=="no" || ape2_user=="no tengo"){
        ape2_user='';
    }
    if (anteced_salud_inp=="" || anteced_salud_inp=="ninguno" || anteced_salud_inp=="ninguna" || anteced_salud_inp=="no" || anteced_salud_inp=="no tengo"){
        anteced_salud_inp='';
    }

    // contrasena = md5(contrasena)
    const cipher = crypto.createCipheriv(algorithm,SecurityKey, initVector)
    let contrasen = cipher.update(contrasena, "utf-8", "hex") + cipher.final('hex');


    const query = `INSERT INTO usuarios values(${id_user},2,'${nom1_user}','${nom2_user}','${ape1_user}','${ape2_user}','${correo_sena_user}','${contrasen}','${fk_anteced_salud_sel}','${anteced_salud_inp}',1)`
        conexion.query(query, (error) => {
            if(error) {
                res.json('Ha ocurrido un error. Por favor, inténtelo nuevamente')
            }
            else {
                res.json(`Se agregó correctamente el usuario`)
            }
        })
    
})


// Inicio de sesion

app.post('/iniciar_sesion', (req, res) => {
    let {
        correo_sena_user,contrasena
    } = req.body

    // contrasena = md5(contrasena)
    const cipher = crypto.createCipheriv(algorithm,SecurityKey, initVector)
    let contrasen = cipher.update(contrasena, "utf-8", "hex") + cipher.final('hex');

    const query = `SELECT * FROM usuarios WHERE correo_sena_user='${correo_sena_user}' AND contrasena='${contrasen}' AND estado_user=1`
        conexion.query(query, (error, resultado) => {
            if(error) {
                res.json('Ha ocurrido un error. Por favor, inténtelo nuevamente')
            }
            else {
                if (resultado.length == 1) {
                    return res.json('Se encontró')
                }
                else {
                    return res.json('El correo o la contraseña es incorrecta. Por favor, inténtelo de nuevo')
                }
            }
        })
})

// Obtener rol del usuario que inició sesión

app.post('/get_rol_id', (req, res) => {
    let {
        correo_sena_user,contrasena
    } = req.body

    // contrasena = md5(contrasena)
    const cipher = crypto.createCipheriv(algorithm,SecurityKey, initVector)
    let contrasen = cipher.update(contrasena, "utf-8", "hex") + cipher.final('hex');

    const query = `SELECT fk_tipo_user, id_user FROM usuarios WHERE correo_sena_user='${correo_sena_user}' AND contrasena='${contrasen}' AND estado_user=1`
        conexion.query(query, (error, resultado) => {
            if(error) {
                return res.json('Error')
            }
            else {
                if (resultado.length == 1) {
                    return res.json(resultado)
                }
                else {
                    return res.json('No se encontró el rol del usuario')
                }
            }
        })
})


// Administrador

    // Anuncios

        // Ruta guardar y mostrar las imágenes

app.use('/images', express.static(path.join(__dirname,'images')));

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'images')
    },
    filename: (req, file, callback) => {
        callback(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({storage});

app.get('/anuncios_imagenes/:img_anunc', (req, res) => {
    const { img_anunc } = req.params

    const query = `SELECT img_anunc FROM anuncios WHERE img_anunc='${img_anunc}'`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})

app.post('/anuncios_subir_img', upload.single('file'),(req,res,next)=> {
    const file = req.file;

    if (!file) {
        res.json('No hay archivos');
        // const error = new Error('No hay archivos');
        // error.httpStatusCode = 400;
        // return next(error);
    }
    res.json(file.filename);
});



app.get('/anuncios_listado', (req, res) => {
    const query = `SELECT * FROM anuncios WHERE estado_anunc=1 ORDER BY id_anunc DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/anuncios_listado/:id_anunc', (req, res) => {
    const { id_anunc } = req.params

    const query = `SELECT * FROM anuncios WHERE id_anunc=${id_anunc}`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        console.log(resultado)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.post('/anuncios_agregar', (req,res) => {
    let {
        fk_id_admin_anunc,titulo_anunc,desc_anunc,img_anunc
    } = req.body

    const query = `INSERT INTO anuncios VALUES (NULL,${fk_id_admin_anunc},'${titulo_anunc}','${desc_anunc}','${img_anunc}',1)`
        conexion.query(query, (error) => {
            if(error) {
                res.json('Un error ocurrió. Por favor, inténtelo nuevamentente')
            }
            else {
                res.json(`Se agregó correctamente el anuncio`)
            }
        })
})


app.put('/anuncios_edicion/:id_anunc', (req, res) => {
    const { id_anunc } = req.params
    let {
        fk_id_admin_anunc,titulo_anunc,desc_anunc,img_anunc,estado_anunc
    } = req.body

    const query = `UPDATE anuncios SET fk_id_admin_anunc=${fk_id_admin_anunc}, titulo_anunc='${titulo_anunc}', desc_anunc='${desc_anunc}', img_anunc='${img_anunc}', estado_anunc=${estado_anunc} WHERE id_anunc=${id_anunc}`
    conexion.query(query, (error) => {
        if(error) return console.error(error.message)

        res.json(`Se actualizó correctamente el anuncio`)
    })
})


app.delete('/anuncios_eliminacion/:id_anunc', (req, res) => {
    const { id_anunc } = req.params

    const query = `UPDATE anuncios SET estado_anunc=0 WHERE id_anunc=${id_anunc}`
    conexion.query(query, (error) => {
        if(error) return console.error(error.message)

        res.json(`Se eliminó correctamente el anuncio`)
    })
})


    // Usuarios


app.get('/validacion_existencia_usuarios', (req, res) => {
    const query = `SELECT * FROM usuarios`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(`Si hay registros`)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/usuarios_listado', (req, res) => {
    const query = `SELECT id_user, tipo_user, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user=cod_tipo_user`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/validacion_existencia_usuarios/:id_user', (req, res) => {
    const { id_user } = req.params

    const query = `SELECT * FROM usuarios WHERE id_user=${id_user}`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(`Si existe`)
        } else {
            res.json(`No existe`)
        }
    })
})


app.get('/usuarios_listado/:id_user', (req, res) => {
    const { id_user } = req.params

    const query = `SELECT id_user, fk_tipo_user, tipo_user, nom1_user, nom2_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user = cod_tipo_user
    WHERE id_user=${id_user}`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/usuarios_listado_filtrado_id/:id_user', (req, res) => {
    const { id_user } = req.params

    const query = `SELECT id_user, fk_tipo_user, tipo_user, nom1_user, nom2_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user = cod_tipo_user
    WHERE id_user LIKE '${id_user}%'`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/usuarios_listado_filtrado_nombre1/:nom1_user', (req, res) => {
    const { nom1_user } = req.params

    const query = `SELECT id_user, fk_tipo_user, tipo_user, nom1_user, nom2_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user = cod_tipo_user
    WHERE LOWER(nom1_user) LIKE LOWER('${nom1_user}%')`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.post('/usuarios_listado_filtrado_nombres', (req, res) => {
    const { nom1_user, ape1_user } = req.body

    const query = `SELECT id_user, fk_tipo_user, tipo_user, nom1_user, nom2_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user = cod_tipo_user
    WHERE LOWER(nom1_user) LIKE LOWER('${nom1_user}%') AND LOWER(ape1_user) LIKE LOWER('${ape1_user}%')`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/usuarios_listado_filtrado_rol/:fk_tipo_user', (req, res) => {
    const { fk_tipo_user } = req.params

    const query = `SELECT id_user, fk_tipo_user, tipo_user, nom1_user, nom2_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user = cod_tipo_user
    WHERE fk_tipo_user='${fk_tipo_user}'`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.put('/usuarios_edicion/:id_user', (req, res) => {
    const { id_user } = req.params
    let {
        fk_tipo_user,nom1_user,nom2_user,ape1_user,ape2_user,correo_sena_user,fk_anteced_salud_sel,anteced_salud_inp,estado_user
    } = req.body

    if (nom2_user=="" || nom2_user=="ninguno" || nom2_user=="no" || nom2_user=="no tengo"){
        nom2_user='';
    }
    if (ape2_user=="" || ape2_user=="ninguno" || ape2_user=="no" || ape2_user=="no tengo"){
        ape2_user='';
    }
    if (anteced_salud_inp=="" || anteced_salud_inp=="ninguno" || anteced_salud_inp=="ninguna" || anteced_salud_inp=="no" || anteced_salud_inp=="no tengo"){
        anteced_salud_inp='';
    }

    const query = `UPDATE usuarios SET fk_tipo_user=${fk_tipo_user}, nom1_user='${nom1_user}', nom2_user='${nom2_user}', ape1_user='${ape1_user}', ape2_user='${ape2_user}', correo_sena_user='${correo_sena_user}', fk_anteced_salud_sel='${fk_anteced_salud_sel}', anteced_salud_inp='${anteced_salud_inp}', estado_user=${estado_user} WHERE id_user=${id_user}`
    conexion.query(query, (error) => {
        if(error) return console.error(error.message)

        res.json(`Se actualizó correctamente el usuario`)
    })
})


app.get('/usuarios_reporte', (req, res) => {
    const query = `SELECT id_user, tipo_user, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user=cod_tipo_user`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {

            const doc = new PDF({size: 'A3', bufferPages: true});

            const filenamepdf = `ReporteUsuarios${Date.now()}.pdf`;
            
            const stream = res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment; filename=${filenamepdf}`
            });

            doc.on('data', (data) => {stream.write(data)});
            doc.on('end', () => {stream.end()});

            doc.setDocumentHeader({
                height: '18%'
            }, () => {
                doc.fontSize(17).text('Reporte de usuarios', {
                    // width: '100%',
                    align: 'center',
                    // height: 100,
                    lineGap: 17,
                    // indent: 17,
                    paragraphGap: 17,
                    
                })

                doc.fontSize(12);

                let fechaCompletaAct = new Date();
                let horaCompletaAct = fechaCompletaAct.toLocaleTimeString();
                let indexLastColon = horaCompletaAct.lastIndexOf(':');
                let ultimaParteHora = horaCompletaAct.slice(indexLastColon+1,)
                let ultimaParteHoraFinal = ultimaParteHora.replace(/^.\S/, '');
                let horaFinal = horaCompletaAct.slice(0,indexLastColon)+ultimaParteHoraFinal

                
                // doc.text(`Fecha: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${new Date().toISOString().replace(/\T.+/, '')}, Hora: ${new Date(UTC).toISOString().replace(/^.+T/, '').replace(/\..+/, '')}`, {
                // doc.text(`Fecha: ${fechaAct.toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${fechaAct.toISOString().replace(/\T.+/, '')}, Hora: ${fechaAct.toLocaleTimeString()}`, {
                doc.text(`Fecha: ${fechaCompletaAct.toISOString().replace(/\T.+/, '')}      Hora: ${horaFinal}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                })
            });

            
            let cont = 1;

            let datosRegistros = resultado.map((usuario) => {
                const registro = {
                    id_user: usuario.id_user,
                    tipo_user: usuario.tipo_user,
                    nom1_user: usuario.nom1_user,
                    ape1_user: usuario.ape1_user,
                    ape2_user: usuario.ape2_user,
                    correo_sena_user: usuario.correo_sena_user,
                    fk_anteced_salud_sel: usuario.fk_anteced_salud_sel,
                    anteced_salud_inp: usuario.anteced_salud_inp,
                    estado_user: (usuario.estado_user == 1) ? 'Activo' : 'Inactivo',
                }
                cont++;
                return registro;
            });

            doc.addTable([
                {key: 'id_user', label: 'Identificación', align: 'left'},
                {key: 'tipo_user', label: 'Tipo de usuario', align: 'left'},
                {key: 'nom1_user', label: 'P.nombre aprendiz', align: 'left'},
                {key: 'ape1_user', label: 'P.apellido aprendiz', align: 'left'},
                {key: 'ape2_user', label: 'S.apellido aprendiz', align: 'left'},
                {key: 'correo_sena_user', label: 'Correo aprendiz', align: 'left'},
                {key: 'fk_anteced_salud_sel', label: 'Antecedentes #1', align: 'left'},
                {key: 'anteced_salud_inp', label: 'Antecedentes #2', align: 'left'},
                {key: 'estado_user', label: 'Estado del usuario', align: 'left'},
            ], datosRegistros, {
                border: null,
                // width: "fill_body",
                width: "fill_body",
                striped: true,
                stripedColors: ["#f6f6f6", "#e3e3e3"],
                marginLeft: 40,
                marginRight: 40,
                // border: {size: 0.1, color: '#b4b4b4'},
                headFontSize: 6.5,
                headAlign: 'center',
                cellsFontSize: 7,
                cellsMaxWidth : 260,
                cellsPadding: 8,
            })

            doc.render();


            doc.end();


            // res.json('ok')

        } else {

            // res.json(`No hay registros`)

        }
    })
})


app.get('/usuarios_reporte/:id_user', (req, res) => {
    const { id_user } = req.params

    const query = `SELECT id_user, tipo_user, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, estado_user
    FROM usuarios
    INNER JOIN tipos_usuarios
    ON fk_tipo_user=cod_tipo_user
    WHERE id_user=${id_user}`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {

            const doc = new PDF({size: 'A3', bufferPages: true});

            const filenamepdf = `ReporteUsuario_identificacion_${id_user}.pdf`;
            
            const stream = res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment; filename=${filenamepdf}`
            });

            doc.on('data', (data) => {stream.write(data)});
            doc.on('end', () => {stream.end()});

            doc.setDocumentHeader({
                height: '18%'
            }, () => {
                doc.fontSize(17).text('Reporte de usuario', {
                    // width: '100%',
                    align: 'center',
                    // height: 100,
                    lineGap: 17,
                    // indent: 17,
                    paragraphGap: 17,
                    
                })

                doc.fontSize(12);

                let fechaCompletaAct = new Date();
                let horaCompletaAct = fechaCompletaAct.toLocaleTimeString();
                let indexLastColon = horaCompletaAct.lastIndexOf(':');
                let ultimaParteHora = horaCompletaAct.slice(indexLastColon+1,)
                let ultimaParteHoraFinal = ultimaParteHora.replace(/^.\S/, '');
                let horaFinal = horaCompletaAct.slice(0,indexLastColon)+ultimaParteHoraFinal

                
                // doc.text(`Fecha: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${new Date().toISOString().replace(/\T.+/, '')}, Hora: ${new Date(UTC).toISOString().replace(/^.+T/, '').replace(/\..+/, '')}`, {
                // doc.text(`Fecha: ${fechaAct.toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${fechaAct.toISOString().replace(/\T.+/, '')}, Hora: ${fechaAct.toLocaleTimeString()}`, {
                doc.text(`Fecha: ${fechaCompletaAct.toISOString().replace(/\T.+/, '')}      Hora: ${horaFinal}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Usuario: ${resultado[0].ape1_user} ${resultado[0].ape2_user} ${resultado[0].nom1_user}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Identificación: ${resultado[0].id_user}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                })

            });

            
            let cont = 1;

            let datosRegistros = resultado.map((usuario) => {
                const registro = {
                    id_user: usuario.id_user,
                    tipo_user: usuario.tipo_user,
                    nom1_user: usuario.nom1_user,
                    ape1_user: usuario.ape1_user,
                    ape2_user: usuario.ape2_user,
                    correo_sena_user: usuario.correo_sena_user,
                    fk_anteced_salud_sel: usuario.fk_anteced_salud_sel,
                    anteced_salud_inp: usuario.anteced_salud_inp,
                    estado_user: (usuario.estado_user == 1) ? 'Activo' : 'Inactivo',
                }
                cont++;
                return registro;
            });

            doc.addTable([
                {key: 'id_user', label: 'Identificación', align: 'left'},
                {key: 'tipo_user', label: 'Tipo de usuario', align: 'left'},
                {key: 'nom1_user', label: 'P.nombre aprendiz', align: 'left'},
                {key: 'ape1_user', label: 'P.apellido aprendiz', align: 'left'},
                {key: 'ape2_user', label: 'S.apellido aprendiz', align: 'left'},
                {key: 'correo_sena_user', label: 'Correo aprendiz', align: 'left'},
                {key: 'fk_anteced_salud_sel', label: 'Antecedentes #1', align: 'left'},
                {key: 'anteced_salud_inp', label: 'Antecedentes #2', align: 'left'},
                {key: 'estado_user', label: 'Estado del usuario', align: 'left'},
            ], datosRegistros, {
                border: null,
                // width: "fill_body",
                width: "fill_body",
                striped: true,
                stripedColors: ["#f6f6f6", "#e3e3e3"],
                marginLeft: 40,
                marginRight: 40,
                // border: {size: 0.1, color: '#b4b4b4'},
                headFontSize: 6.5,
                headAlign: 'center',
                cellsFontSize: 7,
                cellsMaxWidth : 260,
                cellsPadding: 8,
            })

            doc.render();


            doc.end();


            // res.json('ok')

        } else {

            // res.json(`No hay registros`)

        }
    })
})



// Aprendiz

app.get('/musculos', (req, res) => {
    const query = `SELECT * FROM musculos`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/validacion_existencia_registros_planificador', (req, res) => {
    const query = `SELECT * FROM planificador`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(`Si hay registros`)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/validacion_existencia_registros_planificador/:id_user', (req, res) => {
    const { id_user } = req.params

    const query = `SELECT * FROM usuarios INNER JOIN planificador ON fk_id_aprend=id_user WHERE id_user=${id_user} AND estado_user=1`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(`Si hay registros`)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.post('/planificador', (req,res) => {
    let {
        id_aprend,musculo
    } = req.body

    const query = `INSERT INTO planificador VALUES (NULL,${id_aprend},'${musculo}')`
        conexion.query(query, (error) => {
            if(error) {
                res.json('Un error ocurrió. Por favor, inténtelo nuevamentente')
            }
            else {
                res.json(`Se agregó correctamente`)
            }
        })
})


app.get('/ejercicios_musculo/:musculo', (req, res) => {
    const { musculo } = req.params

    const query = `SELECT pkfk_musculo, pkfk_ejercicio, imagen_ejerc FROM musculos_ejercicios INNER JOIN ejercicios ON pkfk_ejercicio=ejercicio WHERE pkfk_musculo='${musculo}'`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/planificador_aprendices_reporte', (req, res) => {
    const query = `SELECT id_reg_planif, id_user, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_musculo
    FROM usuarios
    INNER JOIN planificador
    ON fk_id_aprend=id_user`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {

            const doc = new PDF({size: 'A3', bufferPages: true});

            const filenamepdf = `ReporteRutinasAprendices${Date.now()}.pdf`;
            
            const stream = res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment; filename=${filenamepdf}`
            });

            doc.on('data', (data) => {stream.write(data)});
            doc.on('end', () => {stream.end()});

            // doc.pipe(res);
            
            // doc.text('hola mundo con pdfkit', 30, 30);

            // doc.text(resultado[1]['fecha_asis']);

            // doc.pipe(fs.createWriteStream('asistencias.pdf'));

            doc.setDocumentHeader({
                height: '18%'
            }, () => {
                // doc.lineJoin('miter')
                //     .rect(0, 0, doc.page.width, doc.header.options.heightNumber).fill("#ededed");

                // doc.fill("#115dc8")
                //     .fontSize(20)
                //     .text("Hello world header", doc.header.x, doc.header.y);
                doc.fontSize(17).text('Reporte rutinas de aprendices', {
                    // width: '100%',
                    align: 'center',
                    // height: 100,
                    lineGap: 17,
                    // indent: 17,
                    paragraphGap: 17,
                    
                })

                doc.fontSize(12);

                let fechaCompletaAct = new Date();
                let horaCompletaAct = fechaCompletaAct.toLocaleTimeString();
                let indexLastColon = horaCompletaAct.lastIndexOf(':');
                let ultimaParteHora = horaCompletaAct.slice(indexLastColon+1,)
                let ultimaParteHoraFinal = ultimaParteHora.replace(/^.\S/, '');
                let horaFinal = horaCompletaAct.slice(0,indexLastColon)+ultimaParteHoraFinal

                
                // doc.text(`Fecha: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${new Date().toISOString().replace(/\T.+/, '')}, Hora: ${new Date(UTC).toISOString().replace(/^.+T/, '').replace(/\..+/, '')}`, {
                // doc.text(`Fecha: ${fechaAct.toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${fechaAct.toISOString().replace(/\T.+/, '')}, Hora: ${fechaAct.toLocaleTimeString()}`, {
                doc.text(`Fecha: ${fechaCompletaAct.toISOString().replace(/\T.+/, '')}      Hora: ${horaFinal}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                })
            });


            let cont = 1;

            let datosRegistros = resultado.map((aprendizRutina) => {
                const registro = {
                    id_reg_planif: aprendizRutina.id_reg_planif,
                    id_user: aprendizRutina.id_user,
                    nom1_user: aprendizRutina.nom1_user,
                    ape1_user: aprendizRutina.ape1_user,
                    ape2_user: aprendizRutina.ape2_user,
                    correo_sena_user: aprendizRutina.correo_sena_user,
                    fk_musculo: aprendizRutina.fk_musculo,
                }
                cont++;
                return registro;
            });

            doc.addTable([
                {key: 'id_reg_planif', label: 'Identificador registro', align: 'left'},
                {key: 'id_user', label: 'Identificación aprendiz', align: 'left'},
                {key: 'nom1_user', label: 'P.nombre aprendiz', align: 'left'},
                {key: 'ape1_user', label: 'P.apellido aprendiz', align: 'left'},
                {key: 'ape2_user', label: 'S.apellido aprendiz', align: 'left'},
                {key: 'correo_sena_user', label: 'Correo aprendiz', align: 'left'},
                {key: 'fk_musculo', label: 'Músculo elegido', align: 'left'},
            ], datosRegistros, {
                border: null,
                // width: "fill_body",
                width: "fill_body",
                striped: true,
                stripedColors: ["#f6f6f6", "#e3e3e3"],
                marginLeft: 45,
                marginRight: 45,
                // border: {size: 0.1, color: '#b4b4b4'},
                headFontSize: 8,
                headAlign: 'center',
                cellsFontSize: 8,
                cellsMaxWidth : 260,
                cellsPadding: 8,
            })

            doc.render();


            doc.end();


            // res.json('ok')

        } else {

            // res.json(`No hay registros`)

        }
    })
})


app.get('/planificador_aprendices_reporte/:id_user', (req, res) => {
    const { id_user } = req.params

    const query = `SELECT id_reg_planif, id_user, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_musculo
    FROM usuarios
    INNER JOIN planificador
    ON fk_id_aprend=id_user
    WHERE id_user=${id_user}`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {

            const doc = new PDF({size: 'A3', bufferPages: true});

            const filenamepdf = `ReporteRutinaAprendiz_identificacion_${id_user}.pdf`;
            
            const stream = res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment; filename=${filenamepdf}`
            });

            doc.on('data', (data) => {stream.write(data)});
            doc.on('end', () => {stream.end()});

            // doc.pipe(res);
            
            // doc.text('hola mundo con pdfkit', 30, 30);

            // doc.text(resultado[1]['fecha_asis']);

            // doc.pipe(fs.createWriteStream('asistencias.pdf'));

            doc.setDocumentHeader({
                height: '22%'
            }, () => {
                // doc.lineJoin('miter')
                //     .rect(0, 0, doc.page.width, doc.header.options.heightNumber).fill("#ededed");

                // doc.fill("#115dc8")
                //     .fontSize(20)
                //     .text("Hello world header", doc.header.x, doc.header.y);
                doc.fontSize(17).text('Reporte rutina de aprendiz', {
                    // width: '100%',
                    align: 'center',
                    // height: 100,
                    lineGap: 17,
                    // indent: 17,
                    paragraphGap: 17,
                    
                })

                doc.fontSize(12);

                let fechaCompletaAct = new Date();
                let horaCompletaAct = fechaCompletaAct.toLocaleTimeString();
                let indexLastColon = horaCompletaAct.lastIndexOf(':');
                let ultimaParteHora = horaCompletaAct.slice(indexLastColon+1,)
                let ultimaParteHoraFinal = ultimaParteHora.replace(/^.\S/, '');
                let horaFinal = horaCompletaAct.slice(0,indexLastColon)+ultimaParteHoraFinal

                
                // doc.text(`Fecha: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${new Date().toISOString().replace(/\T.+/, '')}, Hora: ${new Date(UTC).toISOString().replace(/^.+T/, '').replace(/\..+/, '')}`, {
                // doc.text(`Fecha: ${fechaAct.toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${fechaAct.toISOString().replace(/\T.+/, '')}, Hora: ${fechaAct.toLocaleTimeString()}`, {
                doc.text(`Fecha: ${fechaCompletaAct.toISOString().replace(/\T.+/, '')}      Hora: ${horaFinal}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Aprendiz: ${resultado[0].ape1_user} ${resultado[0].ape2_user} ${resultado[0].nom1_user}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Identificación: ${resultado[0].id_user}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Correo electrónico: ${resultado[0].correo_sena_user}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                })
            });


            let cont = 1;

            let datosRegistros = resultado.map((aprendizRutina) => {
                const registro = {
                    id_reg_planif: aprendizRutina.id_reg_planif,
                    // id_user: aprendizRutina.id_user,
                    nom1_user: aprendizRutina.nom1_user,
                    ape1_user: aprendizRutina.ape1_user,
                    ape2_user: aprendizRutina.ape2_user,
                    // correo_sena_user: aprendizRutina.correo_sena_user,
                    fk_musculo: aprendizRutina.fk_musculo,
                }
                cont++;
                return registro;
            });

            doc.addTable([
                {key: 'id_reg_planif', label: 'Identificador registro', align: 'left'},
                // {key: 'id_user', label: 'Identificación aprendiz', align: 'left'},
                {key: 'nom1_user', label: 'P.nombre aprendiz', align: 'left'},
                {key: 'ape1_user', label: 'P.apellido aprendiz', align: 'left'},
                {key: 'ape2_user', label: 'S.apellido aprendiz', align: 'left'},
                // {key: 'correo_sena_user', label: 'Correo aprendiz', align: 'left'},
                {key: 'fk_musculo', label: 'Músculo elegido', align: 'left'},
            ], datosRegistros, {
                border: null,
                // width: "fill_body",
                width: "fill_body",
                // marginTop : 900,
                striped: true,
                stripedColors: ["#f6f6f6", "#e3e3e3"],
                marginLeft: 55,
                marginRight: 55,
                // border: {size: 0.1, color: '#b4b4b4'},
                headFontSize: 9,
                headAlign: 'left',
                cellsFontSize: 9,
                cellsMaxWidth : 260,
                cellsPadding: 8,
            })

            doc.render();

            doc.setPageNumbers((p, c) => `Page ${p} of ${c}`, "bottom right");
            doc.end();


            // res.json('ok')

        } else {

            // res.json(`No hay registros`)

        }
    })
})


// Instructor



app.get('/validacion_existencia_asistencias', (req, res) => {
    const query = `SELECT * FROM asistencia WHERE estado_asis=1`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(`Si hay registros`)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/asistencia_listado', (req, res) => {
    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/asistencia_listado/:id_registro_asis', (req, res) => {
    const { id_registro_asis } = req.params

    const query = `SELECT * FROM asistencia WHERE id_registro_asis=${id_registro_asis} AND estado_asis=1`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/asistencia_listado_aprend/:fk_id_aprend_asis', (req, res) => {
    const { fk_id_aprend_asis } = req.params

    const query = `SELECT * FROM usuarios WHERE id_user=${fk_id_aprend_asis} AND fk_tipo_user=2 AND estado_user=1`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json('Si existe')
        } else {
            res.json(`No existe`)
        }
    })
})


app.get('/validacion_existencia_asistencias_id/:fk_id_aprend_asis', (req, res) => {
    const { fk_id_aprend_asis } = req.params

    const query = `SELECT * FROM asistencia WHERE fk_id_aprend_asis=${fk_id_aprend_asis} AND estado_asis=1`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json('Si hay registros')
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/validacion_existencia_asistencias_fecha/:fecha_asis', (req, res) => {
    const { fecha_asis } = req.params

    console.log(fecha_asis)

    const query = `SELECT * FROM asistencia WHERE fecha_asis='${fecha_asis}' AND estado_asis=1`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json('Si hay registros')
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/asistencia_listado_filtrado_id_instructor/:id_instruc_asis', (req, res) => {
    const { id_instruc_asis } = req.params

    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1 AND id_instruc_asis LIKE '${id_instruc_asis}%'
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/asistencia_listado_filtrado_id_aprendiz/:fk_id_aprend_asis', (req, res) => {
    const { fk_id_aprend_asis } = req.params

    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1 AND fk_id_aprend_asis LIKE '${fk_id_aprend_asis}%'
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/asistencia_listado_filtrado_nombre1/:nom1_user', (req, res) => {
    const { nom1_user } = req.params

    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1 AND LOWER(nom1_user) LIKE LOWER('${nom1_user}%')
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.post('/asistencia_listado_filtrado_nombres', (req, res) => {
    const { nom1_user, ape1_user } = req.body

    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1 AND LOWER(nom1_user) LIKE LOWER('${nom1_user}%') AND LOWER(ape1_user) LIKE LOWER('${ape1_user}%')
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.get('/asistencia_listado_filtrado_fecha/:fecha_asis', (req, res) => {
    const { fecha_asis } = req.params

    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1 AND fecha_asis='${fecha_asis}'
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})







app.post('/asistencia_agregar', (req,res) => {
    let {
        id_instruc_asis,fk_id_aprend_asis,fecha_asis
    } = req.body

    const query = `INSERT INTO asistencia VALUES (NULL,${id_instruc_asis},${fk_id_aprend_asis},'${fecha_asis}',1)`
        conexion.query(query, (error) => {
            if(error) {
                res.json('Un error ocurrió. Por favor, inténtelo nuevamentente')
            }
            else {
                res.json(`Se agregó correctamente el registro`)
            }
        })
})


app.put('/asistencia_edicion/:id_registro_asis', (req, res) => {
    const { id_registro_asis } = req.params
    let {
        id_instruc_asis,fk_id_aprend_asis,fecha_asis,estado_asis
    } = req.body

    const query = `UPDATE asistencia SET id_instruc_asis=${id_instruc_asis}, fk_id_aprend_asis=${fk_id_aprend_asis}, fecha_asis='${fecha_asis}', estado_asis=${estado_asis} WHERE id_registro_asis=${id_registro_asis}`
    conexion.query(query, (error) => {
        if(error) return console.error(error.message)

        res.json(`Se actualizó correctamente el registro de asistencia`)
    })
})


app.delete('/asistencia_eliminacion/:id_registro_asis', (req, res) => {
    const { id_registro_asis } = req.params

    const query = `UPDATE asistencia SET estado_asis=0 WHERE id_registro_asis=${id_registro_asis}`
    conexion.query(query, (error) => {
        if(error) return console.error(error.message)

        res.json(`Se eliminó correctamente el registro de asistencia`)
    })
})

app.get('/asistencia_reporte', (req, res) => {
    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {

            const doc = new PDF({size: 'A3', bufferPages: true});

            const filenamepdf = `ReporteAsistencias${Date.now()}.pdf`;
            
            const stream = res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment; filename=${filenamepdf}`
            });

            doc.on('data', (data) => {stream.write(data)});
            doc.on('end', () => {stream.end()});

            // doc.pipe(res);
            
            // doc.text('hola mundo con pdfkit', 30, 30);

            // doc.text(resultado[1]['fecha_asis']);

            // doc.pipe(fs.createWriteStream('asistencias.pdf'));

            doc.setDocumentHeader({
                height: '18%'
            }, () => {
                // doc.lineJoin('miter')
                //     .rect(0, 0, doc.page.width, doc.header.options.heightNumber).fill("#ededed");

                // doc.fill("#115dc8")
                //     .fontSize(20)
                //     .text("Hello world header", doc.header.x, doc.header.y);
                doc.fontSize(17).text('Reporte registros de asistencia', {
                    // width: '100%',
                    align: 'center',
                    // height: 100,
                    lineGap: 17,
                    // indent: 17,
                    paragraphGap: 17,
                    
                })

                doc.fontSize(12);

                let fechaCompletaAct = new Date();
                let horaCompletaAct = fechaCompletaAct.toLocaleTimeString();
                let indexLastColon = horaCompletaAct.lastIndexOf(':');
                let ultimaParteHora = horaCompletaAct.slice(indexLastColon+1,)
                let ultimaParteHoraFinal = ultimaParteHora.replace(/^.\S/, '');
                let horaFinal = horaCompletaAct.slice(0,indexLastColon)+ultimaParteHoraFinal

                
                // doc.text(`Fecha: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${new Date().toISOString().replace(/\T.+/, '')}, Hora: ${new Date(UTC).toISOString().replace(/^.+T/, '').replace(/\..+/, '')}`, {
                // doc.text(`Fecha: ${fechaAct.toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${fechaAct.toISOString().replace(/\T.+/, '')}, Hora: ${fechaAct.toLocaleTimeString()}`, {
                doc.text(`Fecha: ${fechaCompletaAct.toISOString().replace(/\T.+/, '')}      Hora: ${horaFinal}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                })
            });

            
            let cont = 1;

            let datosRegistros = resultado.map((asistencia) => {
                const registro = {
                    id_registro_asis: asistencia.id_registro_asis,
                    id_instruc_asis: asistencia.id_instruc_asis,
                    fk_id_aprend_asis: asistencia.fk_id_aprend_asis,
                    nom1_user: asistencia.nom1_user,
                    ape1_user: asistencia.ape1_user,
                    ape2_user: asistencia.ape2_user,
                    correo_sena_user: asistencia.correo_sena_user,
                    fk_anteced_salud_sel: asistencia.fk_anteced_salud_sel,
                    anteced_salud_inp: asistencia.anteced_salud_inp,
                    fecha_asis: (new Date(asistencia.fecha_asis)).toLocaleDateString()
                }
                cont++;
                return registro;
            });

            doc.addTable([
                {key: 'id_registro_asis', label: 'Identificador registro', align: 'left'},
                {key: 'id_instruc_asis', label: 'Identificación instructor', align: 'left'},
                {key: 'fk_id_aprend_asis', label: 'Identificación aprendiz', align: 'left'},
                {key: 'nom1_user', label: 'P.nombre aprendiz', align: 'left'},
                {key: 'ape1_user', label: 'P.apellido aprendiz', align: 'left'},
                {key: 'ape2_user', label: 'S.apellido aprendiz', align: 'left'},
                {key: 'correo_sena_user', label: 'Correo aprendiz', align: 'left'},
                {key: 'fk_anteced_salud_sel', label: 'Antecedentes #1', align: 'left'},
                {key: 'anteced_salud_inp', label: 'Antecedentes #2', align: 'left'},
                {key: 'fecha_asis', label: 'Fecha asistencia', align: 'left'},
            ], datosRegistros, {
                border: null,
                // width: "auto",
                width: "fill_body",
                striped: true,
                stripedColors: ["#f6f6f6", "#e3e3e3"],
                marginLeft: 35,
                marginRight: 35,
                // border: {size: 0.1, color: '#b4b4b4'},
                headFontSize: 6,
                headAlign: 'center',
                cellsFontSize: 7,
                cellsMaxWidth : 90,
                cellsPadding: 8,
            })

            doc.render();


            doc.end();


            // res.json('ok')

        } else {

            // res.json(`No hay registros`)

        }
    })
})

app.get('/asistencia_reporte_id/:id_user', (req, res) => {
    const { id_user } = req.params

    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis 
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1 AND id_user=${id_user}
    ORDER BY fecha_asis DESC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {

            const doc = new PDF({size: 'A3', bufferPages: true});
            const filenamepdf = `ReporteAsistenciaAprendiz_identificacion_${id_user}.pdf`;
            
            const stream = res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment; filename=${filenamepdf}`
            });

            doc.on('data', (data) => {stream.write(data)});
            doc.on('end', () => {stream.end()});

            // doc.pipe(res);
            
            // doc.text('hola mundo con pdfkit', 30, 30);

            // doc.text(resultado[1]['fecha_asis']);

            // doc.pipe(fs.createWriteStream('asistencias.pdf'));

            doc.setDocumentHeader({
                height: '22%'
            }, () => {
                // doc.lineJoin('miter')
                //     .rect(0, 0, doc.page.width, doc.header.options.heightNumber).fill("#ededed");

                // doc.fill("#115dc8")
                //     .fontSize(20)
                //     .text("Hello world header", doc.header.x, doc.header.y);
                doc.fontSize(17).text('Reporte asistencia de aprendiz', {
                    // width: '100%',
                    align: 'center',
                    // height: 100,
                    lineGap: 17,
                    // indent: 17,
                    paragraphGap: 17,
                    
                })

                doc.fontSize(12);

                let fechaCompletaAct = new Date();
                let horaCompletaAct = fechaCompletaAct.toLocaleTimeString();
                let indexLastColon = horaCompletaAct.lastIndexOf(':');
                let ultimaParteHora = horaCompletaAct.slice(indexLastColon+1,)
                let ultimaParteHoraFinal = ultimaParteHora.replace(/^.\S/, '');
                let horaFinal = horaCompletaAct.slice(0,indexLastColon)+ultimaParteHoraFinal

                
                // doc.text(`Fecha: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${new Date().toISOString().replace(/\T.+/, '')}, Hora: ${new Date(UTC).toISOString().replace(/^.+T/, '').replace(/\..+/, '')}`, {
                // doc.text(`Fecha: ${fechaAct.toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${fechaAct.toISOString().replace(/\T.+/, '')}, Hora: ${fechaAct.toLocaleTimeString()}`, {
                doc.text(`Fecha: ${fechaCompletaAct.toISOString().replace(/\T.+/, '')}      Hora: ${horaFinal}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Aprendiz: ${resultado[0].ape1_user} ${resultado[0].ape2_user} ${resultado[0].nom1_user}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Identificación: ${resultado[0].fk_id_aprend_asis}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Correo electrónico: ${resultado[0].correo_sena_user}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                })
            });

            
            let cont = 1;

            let datosRegistros = resultado.map((asistencia) => {
                const registro = {
                    id_registro_asis: asistencia.id_registro_asis,
                    id_instruc_asis: asistencia.id_instruc_asis,
                    // fk_id_aprend_asis: asistencia.fk_id_aprend_asis,
                    nom1_user: asistencia.nom1_user,
                    ape1_user: asistencia.ape1_user,
                    ape2_user: asistencia.ape2_user,
                    // correo_sena_user: asistencia.correo_sena_user,
                    fk_anteced_salud_sel: asistencia.fk_anteced_salud_sel,
                    anteced_salud_inp: asistencia.anteced_salud_inp,
                    fecha_asis: (new Date(asistencia.fecha_asis)).toLocaleDateString()
                }
                cont++;
                return registro;
            });

            doc.addTable([
                {key: 'id_registro_asis', label: 'Identificador registro', align: 'left'},
                {key: 'id_instruc_asis', label: 'Identificación instructor', align: 'left'},
                // {key: 'fk_id_aprend_asis', label: 'Identificación aprendiz', align: 'left'},
                {key: 'nom1_user', label: 'P.nombre aprendiz', align: 'left'},
                {key: 'ape1_user', label: 'P.apellido aprendiz', align: 'left'},
                {key: 'ape2_user', label: 'S.apellido aprendiz', align: 'left'},
                // {key: 'correo_sena_user', label: 'Correo aprendiz', align: 'left'},
                {key: 'fk_anteced_salud_sel', label: 'Antecedentes #1', align: 'left'},
                {key: 'anteced_salud_inp', label: 'Antecedentes #2', align: 'left'},
                {key: 'fecha_asis', label: 'Fecha asistencia', align: 'left'},
            ], datosRegistros, {
                border: null,
                // width: "auto",
                width: "fill_body",
                striped: true,
                stripedColors: ["#f6f6f6", "#e3e3e3"],
                marginLeft: 35,
                marginRight: 35,
                // border: {size: 0.1, color: '#b4b4b4'},
                headFontSize: 6,
                headAlign: 'center',
                cellsFontSize: 7,
                cellsMaxWidth : 90,
                cellsPadding: 8,
            })

            doc.render();


            doc.end();


            // res.json('ok')

        } else {

            // res.json(`No hay registros`)

        }
    })
})

app.get('/asistencia_reporte_fecha/:fecha_asis', (req, res) => {
    const { fecha_asis } = req.params

    const query = `SELECT id_registro_asis, id_instruc_asis, fk_id_aprend_asis, nom1_user, ape1_user, ape2_user, correo_sena_user, fk_anteced_salud_sel, anteced_salud_inp, fecha_asis
    FROM asistencia
    INNER JOIN usuarios
    ON fk_id_aprend_asis=id_user
    WHERE estado_asis = 1 AND fecha_asis='${fecha_asis}'
    ORDER BY id_registro_asis ASC`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {

            const doc = new PDF({size: 'A3', bufferPages: true});

            const filenamepdf = `ReporteAsistencias_fecha_${(new Date(resultado[0].fecha_asis)).toLocaleDateString().replace('/','_')}.pdf`;
            
            const stream = res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment; filename=${filenamepdf}`
            });

            doc.on('data', (data) => {stream.write(data)});
            doc.on('end', () => {stream.end()});

            // doc.pipe(res);
            
            // doc.text('hola mundo con pdfkit', 30, 30);

            // doc.text(resultado[1]['fecha_asis']);

            // doc.pipe(fs.createWriteStream('asistencias.pdf'));

            doc.setDocumentHeader({
                height: '18%'
            }, () => {
                // doc.lineJoin('miter')
                //     .rect(0, 0, doc.page.width, doc.header.options.heightNumber).fill("#ededed");

                // doc.fill("#115dc8")
                //     .fontSize(20)
                //     .text("Hello world header", doc.header.x, doc.header.y);
                doc.fontSize(17).text('Reporte registros de asistencia según fecha', {
                    // width: '100%',
                    align: 'center',
                    // height: 100,
                    lineGap: 17,
                    // indent: 17,
                    paragraphGap: 17,
                    
                })

                doc.fontSize(12);

                let fechaCompletaAct = new Date();
                let horaCompletaAct = fechaCompletaAct.toLocaleTimeString();
                let indexLastColon = horaCompletaAct.lastIndexOf(':');
                let ultimaParteHora = horaCompletaAct.slice(indexLastColon+1,)
                let ultimaParteHoraFinal = ultimaParteHora.replace(/^.\S/, '');
                let horaFinal = horaCompletaAct.slice(0,indexLastColon)+ultimaParteHoraFinal

                
                // doc.text(`Fecha: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${new Date().toISOString().replace(/\T.+/, '')}, Hora: ${new Date(UTC).toISOString().replace(/^.+T/, '').replace(/\..+/, '')}`, {
                // doc.text(`Fecha: ${fechaAct.toISOString().replace(/T/, ' ').replace(/\..+/, '')}, Fecha: ${fechaAct.toISOString().replace(/\T.+/, '')}, Hora: ${fechaAct.toLocaleTimeString()}`, {
                doc.text(`Fecha del reporte: ${fechaCompletaAct.toISOString().replace(/\T.+/, '')}      Hora: ${horaFinal}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
                doc.text(`Registros de asistencia tomados en la fecha: ${(new Date(resultado[0].fecha_asis)).toISOString().replace(/\T.+/, '')}`, {
                    width: 420,
                    align: 'left',
                    height: 150,
                    lineGap: 7,
                    // indent: 5,
                    paragraphGap: 7,
                })
            });

            
            let cont = 1;

            let datosRegistros = resultado.map((asistencia) => {
                const registro = {
                    id_registro_asis: asistencia.id_registro_asis,
                    id_instruc_asis: asistencia.id_instruc_asis,
                    fk_id_aprend_asis: asistencia.fk_id_aprend_asis,
                    nom1_user: asistencia.nom1_user,
                    ape1_user: asistencia.ape1_user,
                    ape2_user: asistencia.ape2_user,
                    correo_sena_user: asistencia.correo_sena_user,
                    fk_anteced_salud_sel: asistencia.fk_anteced_salud_sel,
                    anteced_salud_inp: asistencia.anteced_salud_inp,
                    // fecha_asis: (new Date(asistencia.fecha_asis)).toLocaleDateString()
                }
                cont++;
                return registro;
            });

            doc.addTable([
                {key: 'id_registro_asis', label: 'Identificador registro', align: 'left'},
                {key: 'id_instruc_asis', label: 'Identificación instructor', align: 'left'},
                {key: 'fk_id_aprend_asis', label: 'Identificación aprendiz', align: 'left'},
                {key: 'nom1_user', label: 'P.nombre aprendiz', align: 'left'},
                {key: 'ape1_user', label: 'P.apellido aprendiz', align: 'left'},
                {key: 'ape2_user', label: 'S.apellido aprendiz', align: 'left'},
                {key: 'correo_sena_user', label: 'Correo aprendiz', align: 'left'},
                {key: 'fk_anteced_salud_sel', label: 'Antecedentes #1', align: 'left'},
                {key: 'anteced_salud_inp', label: 'Antecedentes #2', align: 'left'},
                // {key: 'fecha_asis', label: 'Fecha asistencia', align: 'left'},
            ], datosRegistros, {
                border: null,
                // width: "auto",
                width: "fill_body",
                striped: true,
                stripedColors: ["#f6f6f6", "#e3e3e3"],
                marginLeft: 35,
                marginRight: 35,
                // border: {size: 0.1, color: '#b4b4b4'},
                headFontSize: 6,
                headAlign: 'center',
                cellsFontSize: 7,
                cellsMaxWidth : 90,
                cellsPadding: 8,
            })

            doc.render();


            doc.end();


            // res.json('ok')

        } else {

            // res.json(`No hay registros`)

        }
    })
})


