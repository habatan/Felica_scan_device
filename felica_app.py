# FelicaからJavascriptを使ってデータを受け取り表示する
from flask import Flask, render_template, redirect, request, url_for
import numpy.random as randam
import os
import json

# アプリ作成
app = Flask(__name__)

# トランザクション
transaction = {}

# カード読み取りページ
@app.route("/", methods=["GET"])
def scan_page():
    return render_template("felica_scan.html",)

# 決済ページ
@app.route("/payment_page/<user_hash>")
def payment(user_hash):
    print(user_hash)
    if user_hash in transaction:
        idm_data = transaction[user_hash]
        print(f"ハッシュ値 : {user_hash}")
        print(f"idm_data : {transaction[user_hash]}")
        return render_template("payment_page.html", idm_data=idm_data, card_balance="2000円")
    else:
        return message("予期しない接続が発生しました")


# 決済終了後idmカード情報削除
@app.route("/payment_end")
def check_end():
    # transaction削除
    transaction = transaction.clear()
    return redirect("/")


# javascriptからidmデータ
@app.route("/send_data", methods=["POST"])
def get_idm():
    # ajaxから送信されたidm_dataの受け取り
    print(request.form["idm_data"])
    idm_data = request.form["idm_data"]
    hash_data = "".join([str(randam.randint(10)) for _ in range(30)])
    # transactionにidm_dataを保存
    transaction[hash_data] = idm_data
    jsn = json.dumps({"hash_data" : hash_data})
    return jsn

# エラーハンドラーを導入
@app.errorhandler(404)
def method_not_allowed(error):
   return message("このページは存在しません") 
     
@app.errorhandler(405)
def method_not_allowed(error):
   return message("この接続は許可されていません")

# javascript が上手く更新されない(できた)
# https://elsammit-beginnerblg.hatenablog.com/entry/2021/05/13/222411
@app.context_processor
def override_url_for():
    return dict(url_for=dated_url_for)

# メッセージ表示
def message(msg):
   return render_template(
      "message.html",
      msg=msg
   )

# url_forのアップデート
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

