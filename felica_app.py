# FelicaからJavascriptを使ってデータを受け取り表示する
from flask import Flask, render_template, redirect, request, url_for
import os

app = Flask(__name__)

@app.route("/", methods=["GET"])
def home():
    return render_template("usb_access_js.html")

# javascriptからidmデータ
@app.route("/send_data", methods=["POST"])
def get_idm():
    print("お届け物だよ")
    print(request.form)
    # data = request.form["idm_data"]
    return redirect("/")

# javascript が上手く更新されない(できた)
# https://elsammit-beginnerblg.hatenablog.com/entry/2021/05/13/222411
@app.context_processor
def override_url_for():
    return dict(url_for=dated_url_for)

def dated_url_for(endpoint, **values):
    if endpoint == 'static':
        filename = values.get('filename', None)
        if filename:
            file_path = os.path.join(app.root_path,
                                     endpoint, filename)
            values['q'] = int(os.stat(file_path).st_mtime)
    return url_for(endpoint, **values)

if __name__ == "__main__":
    app.run(debug=True, port=8888)

