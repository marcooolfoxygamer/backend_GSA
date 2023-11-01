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

const app = express()

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next()
})

// Middlewares
app.use(cors({origin:"*"}));
app.use(bodyParser.json());
app.use(morgan('dev'));

// encrypt
const algorithm = "aes-256-cbc";
const initVector = crypto.randomBytes(16);
const SecurityKey = crypto.randomBytes(32);

const PUERTO = 9300

const conexion = mysql.createConnection(
    {
        host:'localhost',
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
        callback(null, file.originalname);
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


app.put('/usuarios_edicion/:id_user', (req, res) => {
    const { id_user } = req.params
    let {
        fk_tipo_user,nom1_user,nom2_user,ape1_user,ape2_user,correo_sena_user,fk_anteced_salud_sel,anteced_salud_inp,estado_user
    } = req.body

    const query = `UPDATE usuarios SET fk_tipo_user=${fk_tipo_user}, nom1_user='${nom1_user}', nom2_user='${nom2_user}', ape1_user='${ape1_user}', ape2_user='${ape2_user}', correo_sena_user='${correo_sena_user}', fk_anteced_salud_sel='${fk_anteced_salud_sel}', anteced_salud_inp='${anteced_salud_inp}', estado_user=${estado_user} WHERE id_user=${id_user}`
    conexion.query(query, (error) => {
        if(error) return console.error(error.message)

        res.json(`Se actualizó correctamente el usuario`)
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


// Instructor

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

    const query = `SELECT * FROM asistencia WHERE id_registro_asis=${id_registro_asis}`
    conexion.query(query, (error, resultado) => {
        if(error) return console.error(error.message)

        if(resultado.length > 0) {
            res.json(resultado)
        } else {
            res.json(`No hay registros`)
        }
    })
})


app.post('/asistencia_listado_aprend', (req, res) => {
    let {
        fk_id_aprend_asis
    } = req.body

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

