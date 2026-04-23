

from flask import Flask, request, jsonify

app = Flask(__name__)
def calculate_need_score(students, facilities, area_type, performance):
    # 1. Student pressure score (max 25)
    # Bigger schools add need, but capped
    student_score = min((students / 2000) * 25, 25)

    # 2. Facility shortage score (max 40)
    # This is the most important part
    # More facilities reduce need, but low facilities increase strongly
    facility_score = max(0, ((60 - facilities) / 60) * 40)

    # 3. Performance score (max 20)
    # Lower performance = higher need
    performance_score = max(0, ((100 - performance) / 100) * 20)

    # 4. Area disadvantage score (max 15)
    area_type = area_type.lower()
    if area_type == "plantation":
        area_score = 15
    elif area_type == "rural":
        area_score = 12
    elif area_type == "urban":
        area_score = 5
    else:
        area_score = 8

    total_score = student_score + facility_score + performance_score + area_score
    return round(min(max(total_score, 0), 100), 2)

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


