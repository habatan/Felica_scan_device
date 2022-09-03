# FelicaからJavascriptを使ってデータを受け取り表示する
from flask import Flask, render_template, redirect, request, url_for
import numpy.random as randam
import os
import json

# アプリ作成
app = Flask(__name__)

# トランザクション
transaction = set()

# カード読み取りページ
@app.route("/", methods=["GET"])
def scan_page():
    return render_template(
            "usb_access_js.html",
            ajex_url_callback="/send_data",
            transitions_page="/payment_page",
        )


# 決済ページ
@app.route("/payment_page/<user_hash>")
def payment(user_hash):
    print(f"受け取ってまっせ : {user_hash}")
    return render_template("payment_page.html", user_name = "hazama")


# 決済終了後idmカード情報削除
@app.route("/payment_end")
def check_end():
    return render_template("fin_transaction.html")

# すべてはここに帰結
@app.route("/logout")
def return_page():
    return redirect("/")

# javascriptからidmデータ
@app.route("/send_data", methods=["POST"])
def get_idm():
    print("お届け物だよ")
    print(request.form["idm_data"])
    # 現在取引を行うデータとして保存しておきたいところ
    data = request.form["idm_data"]

    message = "あーはいはい、200、200"
    send_message = json.dumps({"message":message})
    hash_data = "".join([str(randam.randint(10)) for _ in range(30)])
    transaction.add(hash_data)
    jsn = json.dumps({"data" : hash_data})
    return jsn


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

