

from flask import Flask, request, jsonify

app = Flask(__name__)

def calculate_need_score(students, facilities, area_type, performance):
    score = 0

    # Bigger weight for number of students
    score += (students / 1000) * 20  

    # Bigger impact for facilities (less facilities → higher need)
    score += ((20 - facilities) / 20) * 15  

    # Performance reduces score a bit (higher performance → lower need)
    score += (100 - performance) * 0.5  

    # Area type adjustment
    area_type = area_type.lower()
    if area_type == "rural":
        score += 10
    elif area_type == "urban":
        score += 5
    else:
        score += 7  # default for suburban/other

  
   

    # Clamp score between 0 and 100
    score = min(max(score, 0), 100)
    return round(score, 2)

@app.route('/calculate_need', methods=['POST'])
def calculate_need():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data received"}), 400

    try:
        students = int(data.get('student_count', 0))
        facilities = int(data.get('facilities', 0))
        area_type = data.get('area_type', 'urban')
        performance = int(data.get('performance', 0))
       
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid data types"}), 400

    need_score = calculate_need_score(students, facilities, area_type, performance)
    return jsonify({"need_score": need_score})

@app.route('/', methods=['GET'])
def index():
    return "Flask AI Need Score API is running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


