@echo off
echo Starting DeviceSimulator Backend...

cd backend

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt

echo Starting Server...
python main.py
pause