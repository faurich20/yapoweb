from flask import Flask, render_template, request, jsonify, redirect
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, set_access_cookies, unset_jwt_cookies
import db
import random
import string
from datetime import datetime
import pytz

app = Flask(__name__)

# Configuración JWT y Seguridad
app.config['SECRET_KEY'] = 'tu_secreto_super_seguro' 
app.config['JWT_SECRET_KEY'] = 'jwt_secreto_super_seguro' 
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_CSRF_PROTECT'] = False 
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600 

jwt = JWTManager(app)

class User:
    def __init__(self, id, username, email):
        self.id = id
        self.username = username
        self.email = email

def authenticate(username, password):
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("SELECT * FROM usuario WHERE (nombre = %s OR email = %s)", (username, username))
            user_data = cursor.fetchone()
        conexion.close()
        
        if user_data:
            if user_data['password'] == password:
                return User(user_data['id'], user_data['nombre'], user_data['email'])
    except Exception as e:
        print(f"Error auth: {e}")
    return None

def identity(payload):
    user_id = payload['sub']
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("SELECT * FROM usuario WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
        conexion.close()
        if user_data:
            return User(user_data['id'], user_data['nombre'], user_data['email'])
    except:
        pass
    return None

@jwt.unauthorized_loader
def unauthorized_callback(callback):
    if not request.path.startswith('/api/'):
        return redirect('/login', 302)
    return jsonify({'success': False, 'message': 'Acceso no autorizado'}), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    if not request.path.startswith('/api/'):
        return redirect('/login', 302)
    return jsonify({'success': False, 'message': 'Token expirado'}), 401

@app.route('/api/check_user', methods=['POST'])
def check_user():
    data = request.get_json()
    identifier = data.get('identifier')
    if not identifier:
         return jsonify({'success': False, 'message': 'Ingrese usuario o email'}), 400
    
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("SELECT id FROM usuario WHERE nombre = %s OR email = %s", (identifier, identifier))
            user = cursor.fetchone()
        conexion.close()
        
        if user:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    identifier = data.get('identifier')
    password = data.get('password')
    
    if not identifier or not password:
         return jsonify({'success': False, 'message': 'Datos incompletos'}), 400

    user = authenticate(identifier, password)
    
    if user:
        access_token = create_access_token(identity=str(user.id))
        resp = jsonify({'success': True, 'user': user.username})
        set_access_cookies(resp, access_token)
        return resp
    else:
        return jsonify({'success': False, 'message': 'Clave incorrecta'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    resp = jsonify({'success': True})
    unset_jwt_cookies(resp)
    return resp

@app.route('/api/yapear/realizar_pago', methods=['POST'])
@jwt_required()
def realizar_pago():
    data = request.get_json()
    contacto_id = data.get('contacto_id')
    monto = data.get('monto')
    mensaje = data.get('mensaje', '')
    
    # Validaciones básicas
    if not contacto_id or not monto:
        return jsonify({'success': False, 'message': 'Faltan datos'}), 400
    
    # Generar datos aleatorios
    cod_seguridad = ''.join(random.choices(string.digits, k=3))
    # Generar num_operacion aleatorio de 8 digitos (el script dice CHAR(8) NOT NULL UNIQUE)
    # Usaremos digitos aleatorios por simplicidad, o mezclado. La imagen de yape suele tener numeros.
    num_operacion = ''.join(random.choices(string.digits, k=8)) 

    # Usamos datetime.utcnow() explícitamente para guardar en UTC
    fecha_actual = datetime.utcnow()
    fecha_str = fecha_actual.strftime('%Y-%m-%d')
    hora_str = fecha_actual.strftime('%H:%M:%S')
    
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("""
                INSERT INTO pagos (contacto_id, monto, fecha, hora, cod_seguridad, destino, num_operacion, mensaje) 
                VALUES (%s, %s, %s, %s, %s, 'Yape', %s, %s)
            """, (contacto_id, monto, fecha_str, hora_str, cod_seguridad, num_operacion, mensaje))
            conexion.commit()
        conexion.close()
        return jsonify({'success': True, 'num_operacion': num_operacion})
    except Exception as e:
        print(f"Error pago: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/pago/<num_operacion>')
@jwt_required()
def api_obtener_pago(num_operacion):
    pago = None
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("""
                SELECT p.*, c.nombres, c.num_celular 
                FROM pagos p 
                JOIN contacto c ON p.contacto_id = c.id 
                WHERE p.num_operacion = %s
            """, (num_operacion,))
            pago = cursor.fetchone()
        conexion.close()
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

    if pago:
        # Convertir a zona horaria de Perú al leer
        # Asumimos que la BD guarda en UTC (ya sea porque TiDB es UTC nativo o porque usamos utcnow())
        try:
            # Combinar fecha y hora
            fecha_bd = pago['fecha'] # date
            hora_bd = pago['hora']   # timedelta (pymysql)
            
            # Crear datetime ingenuo (naive)
            dt_naive = datetime.combine(fecha_bd, datetime.min.time()) + hora_bd
            
            # Asignar UTC
            dt_utc = pytz.utc.localize(dt_naive)
            
            # Convertir a Lima
            peru_tz = pytz.timezone('America/Lima')
            dt_peru = dt_utc.astimezone(peru_tz)
            
            # Extraer nueva fecha y hora
            f = dt_peru.date()
            h_time = dt_peru.time()
        except Exception as e:
            # Fallback si falla la conversion
            print(f"Error timezone conversion: {e}")
            f = pago['fecha']
            # h será usado abajo desde pago['hora'] si falla
            h_time = None

        meses = {1:'ene', 2:'feb', 3:'mar', 4:'abr', 5:'may', 6:'jun', 
                 7:'jul', 8:'ago', 9:'sep', 10:'oct', 11:'nov', 12:'dic'}
        
        # Formato de fecha
        fecha_fmt = f"{f.day} {meses[f.month]}. {f.year}"

        # Formato de hora
        if h_time:
             # Usamos el objeto time convertido
             hours = h_time.hour
             minutes = h_time.minute
             ampm = 'p. m.' if hours >= 12 else 'a. m.' # Match image: "p. m."
             h12 = hours if hours <= 12 else hours - 12
             h12 = 12 if h12 == 0 else h12
             hora_fmt = f"{h12}:{minutes:02d} {ampm}"
        else:
            # Fallback a logica original con timedelta
            h = pago['hora']
            seconds = h.total_seconds()
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            ampm = 'a. m.' if hours < 12 else 'p. m.'
            h12 = hours if hours <= 12 else hours - 12
            h12 = 12 if h12 == 0 else h12
            hora_fmt = f"{h12}:{minutes:02d} {ampm}"
        
        cel = pago['num_celular']
        cel_masked = f"*** *** {str(cel)[-3:]}" if cel else None

        cod_seguridad = pago['cod_seguridad'] # Esto es string en DB

        return jsonify({
            'success': True,
            'pago': {
                'monto_fmt': f"{pago['monto']:.2f}",
                'nombres': pago['nombres'],
                'fecha_fmt': fecha_fmt,
                'hora_fmt': hora_fmt,
                'mensaje': pago['mensaje'],
                'cod_seguridad': list(cod_seguridad), # Lista para facil acceso por indice
                'celular_masked': cel_masked,
                'destino': pago['destino'],
                'num_operacion': pago['num_operacion']
            }
        })
    return jsonify({'success': False, 'message': 'No encontrado'}), 404

@app.route('/yapear/exito/<num_operacion>')
@jwt_required()
def yapeo_exito(num_operacion):
    # Ya no pasamos datos, el frontend los pedirá por API
    return render_template('yapeo_exito.html')

@app.route('/api/user')
@jwt_required()
def api_user():
    try:
        user_id = get_jwt_identity()
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("SELECT nombre_completo, saldo FROM usuario WHERE id = %s", (user_id,))
            user = cursor.fetchone()
        conexion.close()

        if user:
            full_name = user['nombre_completo'] if user['nombre_completo'] else ''
            parts = full_name.split()
            # Title case for name
            display_name = " ".join(parts[:2]).title()
            
            saldo = user['saldo']
            return jsonify({'name': display_name, 'saldo': float(saldo)})
        else:
            return jsonify({'name': 'Usuario', 'saldo': 0.00})
    except Exception as e:
        print(f"Error api/user: {e}")
        return jsonify({'name': 'Error', 'saldo': 0.00}), 500

@app.route('/')
@jwt_required()
def home():
    return render_template('home.html')

@app.route('/api/scan_contacto/assign', methods=['POST'])
@jwt_required()
def assign_qr():
    data = request.get_json()
    contacto_id = data.get('contacto_id')
    qr_payload = data.get('qr_payload')
    
    if not contacto_id or not qr_payload:
        return jsonify({'success': False, 'message': 'Datos incompletos'}), 400

    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            # Insertar la relación
            cursor.execute("INSERT INTO scan_contacto (contacto_id, qr_payload, es_valido) VALUES (%s, %s, TRUE)", (contacto_id, qr_payload))
            conexion.commit()
        conexion.close()
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error asignando QR: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/process_qr', methods=['POST'])
@jwt_required()
def process_qr():
    data = request.get_json()
    qr_payload = data.get('qr_data')
    
    if not qr_payload:
        return jsonify({'success': False, 'message': 'No se detectó información en el QR'}), 400

    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            # Buscar el payload en la tabla scan_contacto
            cursor.execute("SELECT contacto_id FROM scan_contacto WHERE qr_payload = %s", (qr_payload,))
            scan_result = cursor.fetchone()
        conexion.close()

        if scan_result:
            contacto_id = scan_result['contacto_id']
            # QR encontrado, redirigir a pagar
            return jsonify({
                'success': True,
                'redirect_url': f'/yapear/monto/{contacto_id}'
            })
        else:
            return jsonify({'success': False, 'message': 'Datos no coinciden (QR desconocido)'}), 404

    except Exception as e:
        print(f"Error procesando QR: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

@app.route('/qr-scanner')
@jwt_required()
def qr_scanner():
    return render_template('qr_scanner.html')



@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/login2')
def login2():
    return render_template('login2.html')

@app.route('/api/contactos', methods=['GET'])
@jwt_required()
def api_obtener_contactos():
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("SELECT * FROM contacto ORDER BY nombres ASC")
            contactos = cursor.fetchall()
        conexion.close()
        return jsonify({'success': True, 'contactos': contactos})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/yapear')
@jwt_required()
def yapear():
    return render_template('yapear.html')

@app.route('/api/contacto/<int:contacto_id>')
@jwt_required()
def api_obtener_contacto(contacto_id):
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            cursor.execute("SELECT * FROM contacto WHERE id = %s", (contacto_id,))
            contacto = cursor.fetchone()
        conexion.close()
        if contacto:
            return jsonify({'success': True, 'contacto': contacto})
        return jsonify({'success': False, 'message': 'Contacto no encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/yapear/monto/<int:contacto_id>')
@jwt_required()
def yapear_monto(contacto_id):
    # La validación se hará vía API en el frontend
    return render_template('yapear_monto.html')

@app.template_filter('format_celular')
def format_celular(value):
    if not value or len(str(value)) != 9:
        return value
    v = str(value)
    return f"{v[:3]} {v[3:6]} {v[6:]}"

@app.route('/api/contactos/agregar', methods=['POST'])
@jwt_required()
def agregar_contacto():
    data = request.get_json()
    nombres = data.get('nombres')
    celular = data.get('num_celular')
    
    if not nombres:
        return jsonify({'success': False, 'message': 'Faltan datos'}), 400
        
    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            # Validar duplicado si hay celular
            if celular:
                cursor.execute("SELECT id FROM contacto WHERE num_celular = %s", (celular,))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': 'El número ya está registrado'}), 400
            
            cursor.execute("INSERT INTO contacto (nombres, num_celular) VALUES (%s, %s)", (nombres, celular))
            conexion.commit()
            new_id = cursor.lastrowid
        conexion.close()
        return jsonify({'success': True, 'id': new_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/contactos/editar', methods=['POST'])
@jwt_required()
def editar_contacto():
    data = request.get_json()
    c_id = data.get('id')
    nombres = data.get('nombres')
    celular = data.get('num_celular')
    
    if not c_id or not nombres:
        return jsonify({'success': False, 'message': 'Faltan datos'}), 400

    try:
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            # Validar duplicado si hay celular nuevo y no es el mismo contacto
            if celular:
                cursor.execute("SELECT id FROM contacto WHERE num_celular = %s AND id != %s", (celular, c_id))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': 'El número ya está registrado'}), 400

            cursor.execute("UPDATE contacto SET nombres = %s, num_celular = %s WHERE id = %s", (nombres, celular, c_id))
            conexion.commit()
        conexion.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/movements')
@jwt_required()
def api_movements():
    try:
        # Get user_id if needed, but current schema doesn't link payments to users explicitly properly 
        # (assuming single user context or user_id logic is implicit in future). 
        # For now, fetching all payments as per existing logic.
        
        conexion = db.obtener_conexion(con_dict=True)
        with conexion.cursor() as cursor:
            # Join with contato to get names
            cursor.execute("""
                SELECT p.num_operacion, p.monto, p.fecha, p.hora, c.nombres, p.destino
                FROM pagos p
                JOIN contacto c ON p.contacto_id = c.id
                ORDER BY p.fecha DESC, p.hora DESC
                LIMIT 7
            """)
            pagos = cursor.fetchall()
        conexion.close()

        movements = []
        meses = {1:'ene.', 2:'feb.', 3:'mar.', 4:'abr.', 5:'may.', 6:'jun.', 
                 7:'jul.', 8:'ago.', 9:'sep.', 10:'oct.', 11:'nov.', 12:'dic.'} # Added dots as per image
        
        # Determine "Ayer"
        peru_tz = pytz.timezone('America/Lima')
        now_peru = datetime.now(peru_tz) # Current time in Peru
        today_date = now_peru.date()

        for p in pagos:
            # Timezone conversion logic (same as in api_obtener_pago)
            try:
                fecha_bd = p['fecha']
                hora_bd = p['hora']
                dt_naive = datetime.combine(fecha_bd, datetime.min.time()) + hora_bd
                dt_utc = pytz.utc.localize(dt_naive)
                dt_peru = dt_utc.astimezone(peru_tz)
                f = dt_peru.date()
                h_time = dt_peru.time()
            except:
                f = p['fecha']
                h_time = None # Fallback logic if needed, but using h_time for formatting

            # Date Formatting
            if f == today_date:
                date_str = "Hoy"
            elif (today_date - f).days == 1:
                date_str = "Ayer"
            else:
                # e.g. "04 feb. 2026"
                date_str = f"{f.day:02d} {meses[f.month]} {f.year}"

            # Time Formatting
            if h_time:
                hours = h_time.hour
                minutes = h_time.minute
                ampm = 'pm' if hours >= 12 else 'am'
                h12 = hours if hours <= 12 else hours - 12
                h12 = 12 if h12 == 0 else h12
                time_str = f"{h12}:{minutes:02d} {ampm}"
            else:
                time_str = ""
            
            # Determine separator
            if f == today_date or (today_date - f).days == 1:
                separator = " "
            else:
                separator = " - "

            full_date_str = f"{date_str}{separator}{time_str}" if time_str else date_str

            movements.append({
                'num_operacion': p['num_operacion'],
                'title': p['nombres'], # Or p['destino'] if Yape?
                'date': full_date_str,
                'amount': float(p['monto']),
                'currency': 'S/',
                'is_negative': True # Assuming all payments are outflows for now
            })

        return jsonify({'success': True, 'movements': movements})

    except Exception as e:
        print(f"Error api/movements: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Ejecuta la aplicación en modo debug
    app.run(debug=True, port=5000)