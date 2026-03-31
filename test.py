from main import allowed_file

def test_allowed_file_extension():
    assert allowed_file("avatar.png") == True