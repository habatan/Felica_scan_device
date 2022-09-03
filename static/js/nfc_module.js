// NFCリーダーからデータを抽出する
// queryselector 文書内の最初の Element 
let messageTitle = document.querySelector( '#message-title' ) ,
button = document.querySelector(' #button ') ,
message = document.querySelector( '#message' ) ,
exe = document.querySelector( '#exe' ) ,
usbDevice = '' ,
usbConfiguration = {} ,
seqNumber = 0 ;
console.log(button.innerHTML) ;

const DeviceFilter = [
    { vendorId : 1356 , productId: 3528 },	// SONY PaSoRi RC-S300/S
    { vendorId : 1356 , productId: 3529 },	// SONY PaSoRi RC-S300/P
] ;

// hazama これが本体やな
exe.addEventListener( 'click', async () => {
    await usbDeviceConnect() ;
    console.log( usbDevice, usbConfiguration ) ;
    await usbDeviceOpen() ;
    await felica() ;
    // make_form("button");
    await usbDeviceClose() ;
    return;
});

//	USB デバイスコネクト
var usbDeviceConnect = async () => {
    const ud = await navigator.usb.getDevices() ;						// ペアリング設定済みデバイスのUSBDeviceインスタンス取得
    let peared = 0 ;
    if ( ud.length > 0 ) {
        for( let dev of ud ) {
            const td = DeviceFilter.find( (fildev) => dev.vendorId == fildev.vendorId && dev.productId == fildev.productId ) ;
            if ( td !== undefined ) {
                ++peared ;
                usbDevice = dev ;
            }
        }
    }
    if ( peared != 1 ) {
        usbDevice = await navigator.usb.requestDevice( { filters: DeviceFilter } ) ;	// USB機器をペアリングフローから選択しデバイスのUSBDeviceインスタンス取得
    }
    
    usbConfiguration.confValue = usbDevice.configuration.configurationValue ;
    usbConfiguration.interfaceNum = usbDevice.configuration.interfaces[ usbConfiguration.confValue ].interfaceNumber ;	// インターフェイス番号
    let ep = getEndPoint( usbDevice.configuration.interfaces[ usbConfiguration.confValue ] , 'in' ) ;	// 入力エンドポイントを求める
    usbConfiguration.endPointInNum = ep.endpointNumber ;												// 入力エンドポイント
    usbConfiguration.endPointInPacketSize = ep.packetSize ;												// 入力パケットサイズ
    ep = getEndPoint( usbDevice.configuration.interfaces[ usbConfiguration.confValue ] , 'out' ) ;		// 出力エンドポイントを求める
    usbConfiguration.endPointOutNum = ep.endpointNumber ;												// 出力エンドポイント
    usbConfiguration.endPointOutPacketSize = ep.packetSize ;											// 出力パケットサイズ

    return;
}

//	USB デバイスオープン
var usbDeviceOpen = async() => {
    message.innerHTML += '**OPEN<br/>' ;

    await usbDevice.open() ;		// USBデバイスセッション開始
    await usbDevice.selectConfiguration( usbConfiguration.confValue ) ;		// USBデバイスの構成を選択
    await usbDevice.claimInterface( usbConfiguration.interfaceNum ) ;		// USBデバイスの指定インターフェイスを排他アクセスにする
    // RC-S300 コマンド
    const endTransparent = [ 0xFF, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00 ] ;
    const startransparent = [ 0xFF, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00 ] ;
    const turnOff = [ 0xFF, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00 ] ;
    const turnOn  = [ 0xFF, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00 ] ;
    const getSerialNumber  = [ 0xFF, 0x5F, 0x03, 0x00 ] ;
    
    let res ;
    
    await sendUSB( endTransparent, 'End Transeparent Session' ) ;
    res = await recvUSB( 64 ) ;
    
    await sendUSB( startransparent, 'Start Transeparent Session' ) ;
    res = await recvUSB( 64 ) ;
    
    await sendUSB( turnOff, 'Turn Off RF' ) ;
    await sleep( 50 ) ;
    res = await recvUSB( 64 ) ;
    await sleep( 50 ) ;

    await sendUSB( turnOn, 'Turn On RF' ) ;
    await sleep( 50 ) ;
    res = await recvUSB( 64 ) ;
    await sleep( 50 ) ;
    
//	await sendUSB( getSerialNumber, 'Get SerialNumber' ) ;
//	res = await recvUSB( 64 ) ;

    return ;
}

//	USB デバイスクローズ
var usbDeviceClose = async() => {
    message.innerHTML += '**CLOSE<br/>' ;

    // RC-S300 コマンド
    const endTransparent = [ 0xFF, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00 ] ;
    const turnOff = [ 0xFF, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00 ] ;
    let res ;
    
    await sendUSB( turnOff, 'Turn Off RF' ) ;
    await sleep( 50 ) ;
    res = await recvUSB( 64 ) ;
    await sleep( 50 ) ;
    
    await sendUSB( endTransparent, 'End Transeparent Session' ) ;
    res = await recvUSB( 64 ) ;

    await usbDevice.releaseInterface( usbConfiguration.interfaceNum ) ;		// USBデバイスの指定インターフェイスを排他アクセスを解放する
    await usbDevice.close() ;		// USBデバイスセッション終了

    return ;
}

//	FeliCa 操作 ( communicateThruEX を使って FeliCa カードを操作する。 )
var felica = async () => {
    // FeliCa Lite-S コマンド
    const polling = [ 0x00, 0xFF, 0xFF, 0x01, 0x00 ] ;		// ポーリング コマンド
    const pollingCom = await usbDeviceCommunicationThruEX( polling ) ;
    console.log( pollingCom ) ;
    let res ;
    
    await sendUSB( pollingCom, 'Polling' ) ;
    res = await recvUSB( 64 ) ;
    let resdata = await usbDeviceCommunicationThruEXResponse( res ) ;
    console.log(resdata ) ;
    
    if ( resdata.status === true ) {
        resdata.IDm = resdata.data.slice(0,8) ;
        resdata.PMm = resdata.data.slice(8,16) ;
        resdata.systemCode = resdata.data.slice(16,18) ;
        button.innerHTML = '' ;
        button.innerHTML = '<p>ﾔｯﾀﾈ</q>' ;
        messageTitle.innerHTML = 'ポーリング成功：カードが見つかりました。<br/>IDm:' + arrayToHex( resdata.IDm ) + '<br/>システムコード:' + arrayToHex( resdata.systemCode ) ;
        await make_form("button", arrayToHex( resdata.IDm )) ;
    } else {
        messageTitle.innerHTML = 'ポーリング失敗：カードが見つかりませんでした。' ;
    }
}

//	communicateThruEX を使って FeliCa カードを操作する。
var usbDeviceCommunicationThruEX = async( argCom ) => {
    // RC-S300 コマンド　communicateThruEX
    const communicateThruEX = [ 0xFF, 0x50, 0x00, 0x01, 0x00 ] ;
    // RC-S300 コマンド　communicateThruEX フッター
    const communicateThruEXFooter = [ 0x00, 0x00, 0x00 ] ;
    // FeliCa リクエストヘッダー
    const felicaHeader = [ 0x5F, 0x46, 0x04 ] ;
    // FeliCa リクエストオプション
    const felicaOption = [ 0x95, 0x82 ] ;
    // タイムアウト(ms)
    let felicaTimeout = 100 ;
    
    // FeliCa Lite-S コマンドにレングスを付加
    let felicaComLen = argCom.length + 1 ;
    let felicaCom = [ felicaComLen, ...argCom ] ;
    console.log( felicaCom ) ;

    // FeliCa Lite-S リクエストヘッダーを付加
    felicaTimeout *= 1e3 ;						// マイクロ秒へ変換
    let felicaReq = [ ...felicaHeader ] ;		// リクエストヘッダー
    felicaReq.push( 255 & felicaTimeout, felicaTimeout >> 8 & 255, felicaTimeout >> 16 & 255, felicaTimeout >> 24 & 255 ) ;		// タイムアウト <<リトルエンディアン>> 4バイト
    felicaReq.push( ...felicaOption ) ;
    felicaReq.push( felicaComLen >> 8 & 255, 255 & felicaComLen ) ;		// コマンドレングス
    felicaReq.push( ...felicaCom ) ;			// リクエストコマンド

    // communicateThruEX コマンド作成
    let felicaReqLen = felicaReq.length ;
    let cTX = [ ...communicateThruEX ] ;
    cTX.push( felicaReqLen >> 8 & 255, 255 & felicaReqLen ) ;		// リクエストレングス
    cTX.push( ...felicaReq ) ;
    cTX.push( ...communicateThruEXFooter ) ;
    
    return cTX ;
}

//	communicateThruEX レスポンスデータを分解
var usbDeviceCommunicationThruEXResponse = async( argRes ) => {
    let data = dataviewToArray( argRes.data ) ;
    let retVal = { status : false } ;
    // レスポンスデータ長の取得
    let v = data.indexOf( 0x97 ) ;			// レスポンスデータから 0x97 の位置を求める
    if ( v >= 0 ) {
        let w = v + 1 ;						// 0x97 の次にデータ長が設定されている。(128バイト以上は未考慮です)
        retVal.Length = data[ w ] ;
        if ( retVal.Length > 0 ) {
            retVal.allData = data.slice( w + 1, w + retVal.Length + 1 ) ;	// 全レスポンスデータ切り出す
            retVal.status = true ;
            retVal.responseCode = retVal.allData[1] ;						// レスポンスコード
            retVal.data = retVal.allData.slice( 2, retVal.allData.length + 1 ) ;	// レスポンスデータ(レングス、レスポンスコードを除いたデータ)
        }
    }
    return retVal ;
}

//	USBデバイスへデータを渡す
var sendUSB = async( argData, argProc = '' ) => {
    const rdData = addReqHeader(argData) ;
    await usbDevice.transferOut( usbConfiguration.endPointOutNum, rdData ) ;
    const dataStr = arrayToHex( rdData ) ;
    console.log( dataStr ) ;
    message.innerHTML += 'SEND (' + argProc + ')<br/>&nbsp;&nbsp;&nbsp;--> [ ' + dataStr + ']<br/>' ;
}

//	リクエストヘッダーの付加
var addReqHeader = ( argData ) => {

    const dataLen = argData.length ;
    const SLOTNUMBER = 0x00 ;

    let retVal = new Uint8Array( 10 + dataLen ) ;

    retVal[0] = 0x6b ;						// ヘッダー作成
    retVal[1] = 255 & dataLen ;				// length をリトルエンディアン
    retVal[2] = dataLen >> 8 & 255 ;
    retVal[3] = dataLen >> 16 & 255 ;
    retVal[4] = dataLen >> 24 & 255 ;
    retVal[5] = SLOTNUMBER ;				// タイムスロット番号
    retVal[6] = ++seqNumber ;				// 認識番号

    0 != dataLen && retVal.set( argData, 10 ) ;	// コマンド追加

    return retVal ;
}

//	USBデバイスからデータを受け取る
var recvUSB = async( argLength ) => {
    const res = await usbDevice.transferIn( usbConfiguration.endPointInNum, argLength ) ;
    const resStr = binArrayToHex( res.data ) ;
    console.log( res ) ;
    message.innerHTML += 'RECV Status[' + res.status + ']<br/>&nbsp;&nbsp;&nbsp;<-- [ ' + resStr + ']<br/>' ;
    
    return res ;
}

//	USBデバイス Endpoint の取得
var getEndPoint = ( argInterface, argVal ) => {
    let retVal = false ;
    for( const val of argInterface.alternate.endpoints ) {
        if ( val.direction == argVal ) { retVal = val ; }
    }
    return retVal ;
}

//	Dataviewから配列への変換
var dataviewToArray = ( argData ) => {
    let retVal = new Array( argData.byteLength ) ;
    for( let i = 0 ; i < argData.byteLength ; ++i ) {
        retVal[i] = argData.getUint8(i) ;
    }
    return retVal ;
}

//	DataViewの8ビットバイナリを16進数で返します。
var binArrayToHex = ( argData ) => {
    let retVal = '' ;
    let temp = [] ;
    for ( let idx = 0 ; idx < argData.byteLength ; idx++) {
        let bt = argData.getUint8( idx ) ;
        let str = bt.toString(16) ;
        str = bt < 0x10 ? '0' + str : str ;
        retVal += str.toUpperCase() + ' ' ;
    }
    return retVal ;
}

//	配列の要素を16進数で返します。
var arrayToHex = ( argData ) => {
    let retVal = '' ;
    let temp = [] ;
    for ( let val of argData ) {
        let str = val.toString(16) ;
        str = val < 0x10 ? '0' + str : str ;
        retVal += str.toUpperCase() + ' ' ;
    }
    return retVal ;
}

//	スリープ
var sleep = async (msec) => {
    return new Promise(resolve => setTimeout(resolve, msec));
}

var make_form = async ( id , idm_data) => {
    // 書き換え部分指定
    var overwrite_html = document.getElementById(id);
    console.log(overwrite_html.innerHTML);
    // 初期化
    overwrite_html.innerHTML = "";
    // 書き換え
    var new_html = '\
        <div id="button">\
            NFCが認識されました！\
            <div name="idm_data" id="idm_data">'　+　idm_data　+　'</div>\
            <button onclick="submitFunction()">送信</button>\
        </div>\
    ';
    return overwrite_html.innerHTML += new_html;
}

// ajaxを使ってデータ送信
var submitFunction = async( ) => {
    var idm_array = document.getElementById("idm_data").innerText ;
    var idm_data = String(idm_array);
    console.log(typeof idm_data);
    // var data_json = JSON.parse({"idm_data" : "' + String(idm_data)+  '"}) ;
    var data_json = JSON.stringify({message : "this is test"});
    console.log(typeof data_json, data_json)
    // send_dataにpostリクエストを送信
    $(function(data_json){
        $.ajax({
            url : "/send_data",
            dataType : "application/json",
            type : "POST",
            data : data_json,
        }).done(
            function(data){
                alert("ok");
            }
        ).fail(
            function(XMLHttpRequest, textStatus, errorThrown){
                alert("error");
            }
        )
    });
    
    return;

}

