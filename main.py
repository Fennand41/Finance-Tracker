import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, Transaction, Goal, Subscription, Debt
from datetime import datetime

app = Flask(__name__)
# Основна конфігурація додатка

# 🔹 Конфігурація
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///transactions.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecretkey'
app.config['UPLOAD_FOLDER'] = "static/icons/avatars"
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# 🔹 Ініціалізація бази даних та Flask-Login
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ✅ ГОЛОВНА СТОРІНКА
@app.route("/")
def index():
    if current_user.is_authenticated:
        transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()
        return render_template("index.html", transactions=transactions, user=current_user)

    # Якщо користувач не авторизований — примусово кидаємо його на логін
    return redirect(url_for("login"))


# ✅ РЕЄСТРАЦІЯ
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        email = request.form["email"]
        username = request.form["username"]
        password = request.form["password"]

        if User.query.filter_by(email=email).first():
            flash("Email вже зареєстрований!", "danger")
            return redirect(url_for("register"))

        new_user = User(email=email, username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        flash("Акаунт створено! Тепер увійдіть.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")

# ✅ ВХІД
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            login_user(user)
            flash("Вхід виконано!", "success")
            return redirect(url_for("profile"))
        else:
            flash("Невірний email або пароль", "danger")

    return render_template("login.html")

# ✅ ВИХІД
@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Ви вийшли з акаунту.", "info")
    return redirect(url_for("login"))

# ✅ ОСОБИСТИЙ КАБІНЕТ
@app.route("/profile")
@login_required
def profile():
    avatar_url = url_for("static", filename=f"icons/avatars/{current_user.avatar}") if current_user.avatar else url_for("static", filename="icons/default.png")
    return render_template("profile.html", user=current_user, avatar_url=avatar_url)

# ✅ ЗМІНА ПАРОЛЮ
@app.route("/change_password", methods=["POST"])
@login_required
def change_password():
    new_password = request.form["new_password"]
    current_user.set_password(new_password)
    db.session.commit()
    flash("Пароль успішно змінено!", "success")
    return redirect(url_for("profile"))

# ✅ ДОДАВАННЯ ТРАНЗАКЦІЇ
@app.route("/add_transaction", methods=["POST"])
@login_required
def add_transaction():
    if not current_user.is_authenticated:
        return jsonify({"error": "Будь ласка, увійдіть в акаунт"}), 403

    data = request.json
    new_transaction = Transaction(
        type=data["type"],
        amount=float(data["amount"]),
        category=data["category"],
        description=data.get("description", ""),
        date=datetime.utcnow(),
        user_id=current_user.id
    )
    db.session.add(new_transaction)
    db.session.commit()

    return get_summary()

# ✅ ОТРИМАННЯ СПИСКУ ТРАНЗАКЦІЙ
@app.route("/get_transactions")
@login_required
def get_transactions():
    transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()
    transactions_list = [
        {
            "id": t.id,
            "type": t.type,
            "amount": t.amount,
            "category": t.category,
            "description": t.description,
            "date": t.date.strftime('%Y-%m-%d')
        }
        for t in transactions
    ]
    return jsonify(transactions_list)

# ✅ ФІНАНСОВИЙ ОГЛЯД
@app.route("/get_summary")
@login_required
def get_summary():
    income = db.session.query(db.func.sum(Transaction.amount)).filter_by(type="income", user_id=current_user.id).scalar() or 0
    expense = db.session.query(db.func.sum(Transaction.amount)).filter_by(type="expense", user_id=current_user.id).scalar() or 0
    balance = income - expense
    return jsonify({"income": income, "expense": expense, "balance": balance})

# ✅ ПЕРЕВІРКА ДОЗВОЛЕНИХ ФОРМАТІВ ФАЙЛІВ
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# ✅ ЗАВАНТАЖЕННЯ АВАТАРА
@app.route("/upload_avatar", methods=["POST"])
@login_required
def upload_avatar():
    if "avatar" not in request.files:
        flash("Файл не був завантажений", "danger")
        return redirect(url_for("profile"))

    file = request.files["avatar"]

    if file.filename == "":
        flash("Ви не обрали файл", "danger")
        return redirect(url_for("profile"))

    if file and allowed_file(file.filename):
        filename = secure_filename(f"{current_user.username}.png")
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        current_user.avatar = filename
        db.session.commit()
        flash("Аватар успішно оновлено!", "success")
    else:
        flash("Неприпустимий формат файлу. Використовуйте PNG, JPG, JPEG, GIF.", "danger")

    return redirect(url_for("profile"))


# ✅ API ДЛЯ ЦІЛЕЙ
@app.route("/api/goals", methods=["GET", "POST"])
@login_required
def goals_api():
    if request.method == "GET":
        goals = Goal.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            "id": g.id,
            "name": g.name,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount,
            "deadline": g.deadline.strftime('%Y-%m-%d') if g.deadline else None
        } for g in goals])

    elif request.method == "POST":
        try:
            data = request.get_json()
            if not data:
                return jsonify(
                    {"success": False, "error": "Дані не надано"}), 400

            # Перевірка обов'язкових полів
            if 'name' not in data or 'target_amount' not in data:
                return jsonify({"success": False,
                                "error": "Відсутні обов'язкові поля"}), 400

            new_goal = Goal(
                name=data["name"],
                target_amount=float(data["target_amount"]),
                current_amount=float(data.get("current_amount", 0)),
                deadline=datetime.strptime(data["deadline"],
                                           '%Y-%m-%d').date() if data.get(
                    "deadline") else None,
                user_id=current_user.id
            )

            db.session.add(new_goal)
            db.session.commit()
            return jsonify({
                "success": True,
                "id": new_goal.id,
                "message": "Ціль успішно створено"
            }), 201

        except ValueError as e:
            return jsonify(
                {"success": False, "error": "Невірний формат числа"}), 400
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500


# ✅ API ДЛЯ ПІДПИСОК
@app.route("/api/subscriptions", methods=["GET", "POST"])
@login_required
def subscriptions_api():
    if request.method == "GET":
        subs = Subscription.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            "id": s.id,
            "name": s.name,
            "amount": s.amount,
            "payment_date": s.payment_date,
            "active": s.is_active
        } for s in subs])

    elif request.method == "POST":
        try:
            data = request.get_json()
            new_sub = Subscription(
                name=data["name"],
                amount=data["amount"],
                payment_date=data["payment_date"],
                is_active=data.get("active", True),
                user_id=current_user.id
            )
            db.session.add(new_sub)
            db.session.commit()
            return jsonify({"success": True, "id": new_sub.id}), 201
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400


# ✅ API ДЛЯ БОРГІВ
@app.route("/api/debts", methods=["GET", "POST"])
@login_required
def debts_api():
    if request.method == "GET":
        debts = Debt.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            "id": d.id,
            "name": d.name,
            "amount": d.amount,
            "is_owed": d.is_owed,
            "due_date": d.due_date.strftime('%Y-%m-%d') if d.due_date else None
        } for d in debts])

    elif request.method == "POST":
        try:
            data = request.get_json()
            new_debt = Debt(
                name=data["name"],
                amount=data["amount"],
                is_owed=data["is_owed"],
                due_date=datetime.strptime(data["due_date"],
                                           '%Y-%m-%d').date() if data.get(
                    "due_date") else None,
                user_id=current_user.id
            )
            db.session.add(new_debt)
            db.session.commit()
            return jsonify({"success": True, "id": new_debt.id}), 201
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400


# ✅ API ДЛЯ ДОДАВАННЯ КОШТІВ ДО ЦІЛІ
@app.route("/api/goals/<int:goal_id>/add", methods=["POST"])
@login_required
def add_to_goal(goal_id):
    try:
        data = request.get_json()
        if not data or 'amount' not in data:
            return jsonify(
                {"success": False, "error": "Сума обов'язкова"}), 400

        goal = Goal.query.filter_by(id=goal_id,
                                    user_id=current_user.id).first()
        if not goal:
            return jsonify({"success": False, "error": "Ціль не знайдено"}), 404

        amount = float(data['amount'])
        goal.current_amount += amount

        # Перевірка, чи не перевищує поточна сума цільову
        if goal.current_amount > goal.target_amount:
            goal.current_amount = goal.target_amount

        db.session.commit()

        return jsonify({
            "success": True,
            "current_amount": goal.current_amount,
            "target_amount": goal.target_amount
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# ✅ API ДЛЯ ПОЗНАЧЕННЯ БОРГУ ЯК СПЛАЧЕНОГО
@app.route("/api/debts/<int:debt_id>/mark_paid", methods=["POST"])
@login_required
def mark_debt_paid(debt_id):
    try:
        debt = Debt.query.filter_by(id=debt_id,
                                    user_id=current_user.id).first()
        if not debt:
            return jsonify({"success": False, "error": "Борг не знайдено"}), 404

        db.session.delete(debt)
        db.session.commit()

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# ✅ API ДЛЯ ВИДАЛЕННЯ ПІДПИСКИ
@app.route("/api/subscriptions/<int:sub_id>", methods=["DELETE"])
@login_required
def delete_subscription(sub_id):
    try:
        sub = Subscription.query.filter_by(id=sub_id,
                                           user_id=current_user.id).first()
        if not sub:
            return jsonify(
                {"success": False, "error": "Підписку не знайдено"}), 404

        db.session.delete(sub)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# ✅ API ДЛЯ ВИДАЛЕННЯ ЦІЛІ
@app.route("/api/goals/<int:goal_id>", methods=["DELETE"])
@login_required
def delete_goal(goal_id):
    try:
        goal = Goal.query.filter_by(id=goal_id,
                                    user_id=current_user.id).first()
        if not goal:
            return jsonify({"success": False, "error": "Ціль не знайдено"}), 404

        db.session.delete(goal)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# ✅ ІНІЦІАЛІЗАЦІЯ БАЗИ ДАНИХ
with app.app_context():
    db.create_all()

# ✅ ЗАПУСК ДОДАТКУ
if __name__ == "__main__":
    app.run(debug=True)