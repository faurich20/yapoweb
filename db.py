# Archivo de conexión a la base de datos (comentarios en español)
import pymysql
import ssl # <--- IMPORTANTE: Necesario para la nube
HOST = 'gateway01.us-east-1.prod.aws.tidbcloud.com'# 'ajrepremio4.mysql.pythonanywhere-services.com' , 'localhost'
USER = '3Gv7qgUN68pAAjV.root' #ajrepremio4 , 'root'
PASSWORD = 't9qk70IBqg8W1zAL' #unpassword1, local: ''
DB = 'bd_yape'
PORT = 4000

def obtener_conexion(con_dict=False):
    # Retorna una conexión PyMySQL; si con_dict=True usa cursores tipo diccionario
    if con_dict:
        clasecursor = pymysql.cursors.DictCursor
    else:
        clasecursor = pymysql.cursors.Cursor

    # Configuración de seguridad SSL para la nube
    # Esto le dice a Python que confíe en la conexión segura de TiDB
    contexto_ssl = ssl.create_default_context()
    contexto_ssl.check_hostname = False
    contexto_ssl.verify_mode = ssl.CERT_NONE
        
    return pymysql.connect(host=HOST,
                                user=USER,
                                password=PASSWORD,
                                db=DB, 
                                port=PORT,
                                charset='utf8mb4',
                                cursorclass=clasecursor,
                                ssl=contexto_ssl # <--- AGREGAMOS ESTO: Obligatorio para TiDB
                                )

# Alias 
obtener_conexion_db = obtener_conexion
