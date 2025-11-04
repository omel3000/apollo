FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --force-reinstall --upgrade pip \
 && pip install --no-cache-dir --force-reinstall --upgrade bcrypt==4.0.1 passlib[bcrypt]==1.7.4 \
 && pip install --no-cache-dir --force-reinstall --upgrade -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

