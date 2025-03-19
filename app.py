import os
import json
import logging
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_key_123")  # Default key for development

# JSON file path
JSON_FILE = "data.json"

def load_json():
    """Load data from JSON file, create if not exists"""
    try:
        logger.debug(f"Intentando cargar JSON desde: {JSON_FILE}")
        if os.path.exists(JSON_FILE):
            logger.debug(f"El archivo JSON existe, leyendo contenido")
            with open(JSON_FILE, 'r') as f:
                try:
                    data = json.load(f)
                    logger.debug(f"JSON cargado exitosamente: {list(data.keys()) if data else 'vacío'}")
                    # Asegurar que todas las estructuras necesarias existan
                    if "users" not in data:
                        data["users"] = {}
                    if "finances" not in data:
                        data["finances"] = {}
                    if "budgets" not in data:
                        data["budgets"] = {}
                    if "goals" not in data:
                        data["goals"] = {}
                    if "categories" not in data:
                        data["categories"] = {}
                    return data
                except json.JSONDecodeError as e:
                    logger.error(f"Error al decodificar JSON: {e}")
                    default_data = {"users": {}, "finances": {}, "budgets": {}, "goals": {}, "categories": {}}
                    save_json(default_data)
                    return default_data
        else:
            logger.debug(f"El archivo JSON no existe, creando uno nuevo")
            default_data = {"users": {}, "finances": {}, "budgets": {}, "goals": {}, "categories": {}}
            save_json(default_data)
            return default_data
    except Exception as e:
        logger.error(f"Error al cargar JSON: {e}", exc_info=True)
        return {"users": {}, "finances": {}, "budgets": {}, "goals": {}, "categories": {}}

def save_json(data):
    """Save data to JSON file"""
    try:
        logger.debug(f"Intentando guardar JSON en: {JSON_FILE}")
        logger.debug(f"Datos a guardar: {list(data.keys()) if data else 'vacío'}")
        
        if "users" in data:
            logger.debug(f"Usuarios a guardar: {list(data['users'].keys())}")
        
        # Asegurar que el directorio existe
        directory = os.path.dirname(JSON_FILE)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)
            logger.debug(f"Creado directorio: {directory}")
        
        with open(JSON_FILE, 'w') as f:
            json.dump(data, f, indent=4)
            
        # Verificar que se guardó correctamente
        if os.path.exists(JSON_FILE):
            file_size = os.path.getsize(JSON_FILE)
            logger.debug(f"JSON guardado exitosamente. Tamaño del archivo: {file_size} bytes")
            return True
        else:
            logger.error(f"Error: El archivo JSON no existe después de intentar guardarlo")
            return False
    except Exception as e:
        logger.error(f"Error al guardar JSON: {e}", exc_info=True)
        return False

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    try:
        data = load_json()
        username = request.form['username'].strip()
        password = request.form['password'].strip()
        
        # Registro de la solicitud de inicio de sesión para depuración
        logger.debug(f"Login attempt for user: {username}")
        logger.debug(f"Available users in data.json: {list(data['users'].keys())}")
        
        # Verificar que el usuario exista
        if username not in data['users']:
            flash('El usuario no existe')
            return redirect(url_for('index'))

        # Verificar que la contraseña sea correcta
        if check_password_hash(data['users'][username]['password'], password):
            session['username'] = username
            session['name'] = data['users'][username].get('name', username)
            flash(f'¡Bienvenido de nuevo, {session["name"]}!')
            return redirect(url_for('dashboard'))
        
        flash('Contraseña incorrecta')
        return redirect(url_for('index'))
    except Exception as e:
        logger.error(f"Error during login: {e}")
        flash('Ocurrió un error durante el inicio de sesión')
        return redirect(url_for('index'))

@app.route('/register', methods=['POST'])
def register():
    try:
        data = load_json()
        username = request.form['username'].strip()
        password = request.form['password'].strip()
        email = request.form.get('email', '').strip()
        name = request.form.get('name', '').strip()

        # Validar datos
        if len(username) < 3:
            flash('El nombre de usuario debe tener al menos 3 caracteres')
            return redirect(url_for('index'))
        
        if len(password) > 6:
            flash('La contraseña no debe tener más de 6 caracteres')
            return redirect(url_for('index'))
        
        if not email or '@' not in email:
            flash('Por favor ingresa un correo electrónico válido')
            return redirect(url_for('index'))

        if username in data['users']:
            flash('El nombre de usuario ya existe')
            return redirect(url_for('index'))

        # Registrar usuario con información detallada de depuración
        logger.debug(f"Registrando nuevo usuario: {username}")
        logger.debug(f"Estado del JSON antes del registro: {data}")
        
        # Guardar nuevo usuario
        data['users'][username] = {
            'password': generate_password_hash(password),
            'email': email,
            'name': name,
            'created_at': datetime.now().isoformat()
        }
        
        # Inicializar estructuras de datos para el nuevo usuario
        if 'finances' not in data:
            data['finances'] = {}
        data['finances'][username] = []
        
        if 'budgets' not in data:
            data['budgets'] = {}
        data['budgets'][username] = {}
        
        if 'goals' not in data:
            data['goals'] = {}
        data['goals'][username] = []
        
        if 'categories' not in data:
            data['categories'] = {}
        data['categories'][username] = []
        
        # Guardar cambios
        save_result = save_json(data)
        logger.debug(f"Resultado de guardar JSON: {save_result}")
        
        if not save_result:
            logger.error("Error al guardar el registro del usuario en el JSON")
            flash('Error al guardar los datos')
            return redirect(url_for('index'))

        # Verificar que se haya guardado correctamente
        verification_data = load_json()
        if username in verification_data['users']:
            logger.debug(f"Usuario {username} guardado correctamente")
        else:
            logger.error(f"Usuario {username} no se guardó correctamente en el JSON")
            
        # Establecer sesión
        session['username'] = username
        session['name'] = name
        
        flash(f'¡Bienvenido a CyberFinance, {name}!')
        return redirect(url_for('dashboard'))
    except Exception as e:
        logger.error(f"Error durante el registro: {e}", exc_info=True)
        flash('Ocurrió un error durante el registro')
        return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect(url_for('index'))
    
    data = load_json()
    if session['username'] not in data['finances']:
        data['finances'][session['username']] = []
        save_json(data)
    
    transactions = data['finances'].get(session['username'], [])
    return render_template('dashboard.html', transactions=transactions)

@app.route('/add_transaction', methods=['POST'])
def add_transaction():
    if 'username' not in session:
        return redirect(url_for('index'))

    data = load_json()
    if session['username'] not in data['finances']:
        data['finances'][session['username']] = []
    
    transaction = {
        'type': request.form['type'],
        'category': request.form['category'],
        'amount': float(request.form['amount']),
        'description': request.form['description'],
        'date': request.form.get('date', datetime.now().strftime('%Y-%m-%d'))
    }

    data['finances'][session['username']].append(transaction)
    save_json(data)
    flash('Transacción agregada exitosamente')
    return redirect(url_for('dashboard'))

@app.route('/logout')
def logout():
    session.pop('username', None)
    session.pop('name', None)
    flash('Has cerrado sesión correctamente')
    return redirect(url_for('index'))

@app.route('/get_transactions')
def get_transactions():
    if 'username' not in session:
        return {'error': 'Unauthorized'}, 401
    
    data = load_json()
    if session['username'] not in data['finances']:
        data['finances'][session['username']] = []
        save_json(data)
    
    transactions = data['finances'].get(session['username'], [])
    return {'transactions': transactions}

# Ruta para verificar el estado del JSON - solo para depuración
@app.route('/debug/check_json', methods=['GET'])
def check_json():
    if app.debug:
        data = load_json()
        return jsonify({
            'users': list(data['users'].keys()),
            'user_count': len(data['users']),
            'data_structure': {k: type(v).__name__ for k, v in data.items()}
        })
    return "Forbidden", 403

@app.route('/delete_transaction', methods=['POST'])
def delete_transaction():
    if 'username' not in session:
        return {'error': 'Unauthorized', 'success': False}, 401
    
    data = load_json()
    
    try:
        transaction_data = request.json
        username = session['username']
        date = transaction_data.get('date')
        description = transaction_data.get('description')
        amount = transaction_data.get('amount')
        
        # Filtrar transacciones para eliminar solo la específica
        original_count = len(data['finances'][username])
        data['finances'][username] = [
            t for t in data['finances'][username] 
            if not (t['date'] == date and t['description'] == description and t['amount'] == amount)
        ]
        
        # Verificar si se eliminó alguna transacción
        if len(data['finances'][username]) == original_count:
            return {'success': False, 'message': 'No se encontró la transacción'}, 404
        
        save_json(data)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error deleting transaction: {e}")
        return {'error': str(e), 'success': False}, 500

@app.route('/delete_data', methods=['POST'])
def delete_data():
    if 'username' not in session:
        return {'error': 'Unauthorized', 'success': False}, 401
    
    data = load_json()
    
    try:
        period_data = request.json
        username = session['username']
        period = period_data.get('period', 'all')
        
        if period == 'all':
            # Eliminar todos los datos
            data['finances'][username] = []
        else:
            current_date = datetime.now()
            
            # Filtrar transacciones basadas en el período
            if period == 'month':
                cutoff_date = datetime(current_date.year, current_date.month - 1 if current_date.month > 1 else 12, current_date.day)
            elif period == 'year':
                cutoff_date = datetime(current_date.year - 1, current_date.month, current_date.day)
            else:
                return {'error': 'Período no válido', 'success': False}, 400
            
            data['finances'][username] = [
                t for t in data['finances'][username] 
                if datetime.fromisoformat(t['date']) >= cutoff_date
            ]
        
        save_json(data)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error deleting data: {e}")
        return {'error': str(e), 'success': False}, 500

@app.route('/get_budgets')
def get_budgets():
    if 'username' not in session:
        return {'error': 'Unauthorized'}, 401
    
    data = load_json()
    
    # Asegurar que existe la estructura para presupuestos
    if 'budgets' not in data:
        data['budgets'] = {}
    
    if session['username'] not in data['budgets']:
        data['budgets'][session['username']] = {}
    
    return {'budgets': data['budgets'].get(session['username'], {})}

@app.route('/save_budget', methods=['POST'])
def save_budget():
    if 'username' not in session:
        return {'error': 'Unauthorized', 'success': False}, 401
    
    data = load_json()
    
    try:
        budget_data = request.json
        username = session['username']
        category = budget_data.get('category')
        limit = budget_data.get('limit')
        
        if not category or not limit:
            return {'error': 'Datos incompletos', 'success': False}, 400
        
        # Asegurar que existe la estructura para presupuestos
        if 'budgets' not in data:
            data['budgets'] = {}
        
        if username not in data['budgets']:
            data['budgets'][username] = {}
        
        # Guardar presupuesto
        data['budgets'][username][category] = float(limit)
        
        save_json(data)
        return {'success': True, 'budgets': data['budgets'][username]}
    except Exception as e:
        logger.error(f"Error saving budget: {e}")
        return {'error': str(e), 'success': False}, 500

@app.route('/delete_budget', methods=['POST'])
def delete_budget():
    if 'username' not in session:
        return {'error': 'Unauthorized', 'success': False}, 401
    
    data = load_json()
    
    try:
        budget_data = request.json
        username = session['username']
        category = budget_data.get('category')
        
        if not category:
            return {'error': 'Categoría no especificada', 'success': False}, 400
        
        # Eliminar presupuesto si existe
        if 'budgets' in data and username in data['budgets'] and category in data['budgets'][username]:
            del data['budgets'][username][category]
        
        save_json(data)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error deleting budget: {e}")
        return {'error': str(e), 'success': False}, 500

# Agregar rutas para metas de ahorro
@app.route('/save_goal', methods=['POST'])
def save_goal():
    if 'username' not in session:
        return {'error': 'Unauthorized', 'success': False}, 401
    
    data = load_json()
    
    try:
        goal_data = request.json
        username = session['username']
        name = goal_data.get('name')
        amount = goal_data.get('amount')
        date = goal_data.get('date')
        
        if not name or not amount or not date:
            return {'error': 'Datos incompletos', 'success': False}, 400
        
        # Asegurar que existe la estructura para metas
        if 'goals' not in data:
            data['goals'] = {}
        
        if username not in data['goals']:
            data['goals'][username] = []
        
        # Añadir nueva meta
        data['goals'][username].append({
            'name': name,
            'amount': float(amount),
            'date': date,
            'current': 0.0  # Cantidad actual ahorrada, inicialmente 0
        })
        
        save_json(data)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error saving goal: {e}")
        return {'error': str(e), 'success': False}, 500

@app.route('/get_goals')
def get_goals():
    if 'username' not in session:
        return {'error': 'Unauthorized'}, 401
    
    data = load_json()
    
    # Asegurar que existe la estructura para metas
    if 'goals' not in data:
        data['goals'] = {}
    
    if session['username'] not in data['goals']:
        data['goals'][session['username']] = []
    
    return {'goals': data['goals'].get(session['username'], [])}

# Agregar rutas para categorías personalizadas
@app.route('/save_category', methods=['POST'])
def save_category():
    if 'username' not in session:
        return {'error': 'Unauthorized', 'success': False}, 401
    
    data = load_json()
    
    try:
        category_data = request.json
        username = session['username']
        name = category_data.get('name')
        type = category_data.get('type')
        
        if not name or not type:
            return {'error': 'Datos incompletos', 'success': False}, 400
        
        # Asegurar que existe la estructura para categorías
        if 'categories' not in data:
            data['categories'] = {}
        
        if username not in data['categories']:
            data['categories'][username] = []
        
        # Añadir nueva categoría si no existe ya
        category_exists = False
        for cat in data['categories'][username]:
            if cat['name'] == name:
                category_exists = True
                break
        
        if not category_exists:
            data['categories'][username].append({
                'name': name,
                'type': type
            })
        
        save_json(data)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error saving category: {e}")
        return {'error': str(e), 'success': False}, 500

@app.route('/get_categories')
def get_categories():
    if 'username' not in session:
        return {'error': 'Unauthorized'}, 401
    
    data = load_json()
    
    # Asegurar que existe la estructura para categorías
    if 'categories' not in data:
        data['categories'] = {}
    
    if session['username'] not in data['categories']:
        data['categories'][session['username']] = []
    
    # Agregar categorías predeterminadas si no hay ninguna
    if len(data['categories'][session['username']]) == 0:
        default_categories = [
            # Categorías de ingreso
            {'name': 'Salario', 'type': 'income'},
            {'name': 'Ventas', 'type': 'income'},
            {'name': 'Freelance', 'type': 'income'},
            {'name': 'Dividendos', 'type': 'income'},
            {'name': 'Intereses', 'type': 'income'},
            {'name': 'Regalías', 'type': 'income'},
            {'name': 'Reembolsos', 'type': 'income'},
            {'name': 'Alquiler', 'type': 'income'},
            {'name': 'Regalos', 'type': 'income'},
            {'name': 'Otros Ingresos', 'type': 'income'},
            
            # Categorías de gasto
            {'name': 'Alimentación', 'type': 'expense'},
            {'name': 'Transporte', 'type': 'expense'},
            {'name': 'Servicios', 'type': 'expense'},
            {'name': 'Entretenimiento', 'type': 'expense'},
            {'name': 'Salud', 'type': 'expense'},
            {'name': 'Educación', 'type': 'expense'},
            {'name': 'Ahorros', 'type': 'expense'},
            {'name': 'Inversiones', 'type': 'expense'},
            {'name': 'Cripto', 'type': 'expense'},
            {'name': 'Ropa', 'type': 'expense'},
            {'name': 'Hogar', 'type': 'expense'},
            {'name': 'Mascotas', 'type': 'expense'},
            {'name': 'Viajes', 'type': 'expense'},
            {'name': 'Seguros', 'type': 'expense'},
            {'name': 'Impuestos', 'type': 'expense'},
            {'name': 'Otros Gastos', 'type': 'expense'}
        ]
        data['categories'][session['username']] = default_categories
        save_json(data)
    
    return {'categories': data['categories'].get(session['username'], [])}

@app.route('/delete_category', methods=['POST'])
def delete_category():
    if 'username' not in session:
        return {'error': 'Unauthorized', 'success': False}, 401
    
    data = load_json()
    
    try:
        category_data = request.json
        username = session['username']
        name = category_data.get('name')
        
        if not name:
            return {'error': 'Nombre no especificado', 'success': False}, 400
        
        # Eliminar categoría si existe
        if 'categories' in data and username in data['categories']:
            data['categories'][username] = [cat for cat in data['categories'][username] if cat['name'] != name]
        
        save_json(data)
        return {'success': True}
    except Exception as e:
        logger.error(f"Error deleting category: {e}")
        return {'error': str(e), 'success': False}, 500

# Punto de entrada para ejecutar la aplicación
if __name__ == "__main__":
    app.debug = True
    app.run(host='0.0.0.0', port=5000, debug=True)