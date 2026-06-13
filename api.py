import json
import joblib
from http.server import BaseHTTPRequestHandler, HTTPServer

model = joblib.load("./train_result/diabetes_xgboost.pkl")
scaler = joblib.load("./train_result/diabetes_scaler.pkl")

class DiabetesHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/predict":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers["Content-Length"])
        body = self.rfile.read(content_length)

        data = json.loads(body)

        values = [[
            data["age"],
            data["hypertension"],
            data["heart_disease"],
            data["bmi"],
            data["HbA1c_level"],
            data["blood_glucose_level"],
            data["gender_Female"],
            data["gender_Male"],
            data["gender_Other"],
            data["smoking_NoInfo"],
            data["smoking_current"],
            data["smoking_ever"],
            data["smoking_former"],
            data["smoking_never"],
            data["smoking_not_current"]
        ]]

        values = scaler.transform(values)

        prediction = int(model.predict(values)[0])
        probability = float(model.predict_proba(values)[0][1])

        response = {
            "prediction": prediction,
            "probability": probability
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

server = HTTPServer(("0.0.0.0", 8080), DiabetesHandler)

print("Server running on :8080")
server.serve_forever()