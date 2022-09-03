# FelicaからJavascriptを使ってデータを受け取り表示する
from flask import Flask, render_template, redirect, request, url_for
import os
import json

app = Flask(__name__)


# カード読み取りページ
@app.route("/", methods=["GET"])
def scan_page():
    return render_template("usb_access_js.html", ajax_url_callback = "/send_data")


# 支払いページ
@app.route("/payment_page")
def payment():
    return render_template("payment_page", user_name = "hazama")



# javascriptからidmデータ
@app.route("/send_data", methods=["POST"])
def get_idm():
    print("お届け物だよ")
    print(request.form["idm_data"])
    # data = request.form["idm_data"]
    message = "あーはいはい、200,200"
    send_message = json.dumps({"message":message})
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

