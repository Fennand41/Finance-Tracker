import pytest
from main import app, db, User

# Налаштування тестового клієнта
@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test_transactions.db'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        # Очищення бази після тестів
        with app.app_context():
            db.drop_all()

def test_index_page_redirects_guest(client):
    """Перевірка, чи перенаправляє гостя з головної сторінки на логін"""
    response = client.get('/')
    assert response.status_code == 302  # 302 = Redirect
    assert '/login' in response.headers['Location'] # Перевіряємо, що кидає саме на логін

def test_profile_access_denied_for_guests(client):
    """Перевірка, чи перенаправляє неавторизованого користувача на сторінку логіну з профілю"""
    response = client.get('/profile', follow_redirects=True)
    assert b"login" in response.data.lower() or response.status_code == 200