## 💻 How to Run Locally

Follow these steps to set up and run the project on your local machine.

**1. Clone the repository**
Open your terminal and clone the project:
```bash
git clone [https://github.com/YourUsername/your-repo-name.git](https://github.com/YourUsername/your-repo-name.git)
cd your-repo-name
```
2. Create a virtual environment
It is highly recommended to use a virtual environment to isolate project dependencies.
Bash
```bash
py -m venv venv
```
3. Activate the virtual environment

On Windows:
```bash
    .\venv\Scripts\activate
```
    
On macOS/Linux:
```bash
    source venv/bin/activate
```
(You should see (venv) appear at the beginning of your terminal prompt).

4. Install dependencies
Install all required libraries from the requirements.txt file:
```bash
pip install -r requirements.txt
```
5. Run the application
Start the Flask development server. The local SQLite database (transactions.db) will be created automatically upon the first run.
```bash
python main.py
```
Open your web browser and navigate to: http://127.0.0.1:5000/
🧪 Running Tests

This project uses pytest for basic unit testing (checking routes and authentication blocks).

To run the test suite, ensure your virtual environment is activated and execute:
Bash
```bash
pytest
```
For a more detailed output (showing exactly which tests passed or failed), use the verbose flag:
Bash
```bash
pytest -v
```