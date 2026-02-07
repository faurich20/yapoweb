
from datetime import datetime
import pytz

def test_peru_time():
    peru_tz = pytz.timezone('America/Lima')
    peru_time = datetime.now(peru_tz)
    print(f"Hora en Perú (simulada con pytz): {peru_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Zona horaria usada: {peru_tz.zone}")

if __name__ == "__main__":
    test_peru_time()
