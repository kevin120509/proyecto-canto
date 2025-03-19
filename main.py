
from app import app

if __name__ == "__main__":
    # Asegurarse de que la aplicación esté accesible desde el exterior
    app.run(host="0.0.0.0", port=5000, debug=True)
