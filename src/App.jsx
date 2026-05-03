import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';

// ==========================================
// 1. 設定與初始化
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC8PjCBiK3j0YKLNQdhj0M6SCpUt3gF7DQ",
  authDomain: "ai-homework-5dcf3.firebaseapp.com",
  projectId: "ai-homework-5dcf3",
  storageBucket: "ai-homework-5dcf3.firebasestorage.app",
  messagingSenderId: "909084261985",
  appId: "1:909084261985:web:61dd8e59e982e6d3577420",
  measurementId: "G-2LF9Y4BHM6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. 樣式定義
// ==========================================
const styles = {
  app: { fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  button: { padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0056b3', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  buttonDanger: { backgroundColor: '#dc3545' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px' },
  input: { width: '100%', padding: '10px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' },
  infoBox: { backgroundColor: '#e9ecef', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#555', marginBottom: '15px' },
  // 優惠區塊樣式
  promoBox: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '8px', padding: '15px', marginBottom: '20px', position: 'relative', overflow: 'hidden' },
  promoTitle: { margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  promoTag: { backgroundColor: '#dc3545', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  chatBox: { height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px', backgroundColor: '#fafafa' },
  bubbleUser: { backgroundColor: '#007bff', color: '#fff', padding: '10px', borderRadius: '15px', margin: '5px 0', alignSelf: 'flex-end', marginLeft: 'auto', width: 'fit-content', maxWidth: '80%' },
  bubbleAi: { backgroundColor: '#e9ecef', color: '#333', padding: '10px', borderRadius: '15px', margin: '5px 0', width: 'fit-content', maxWidth: '80%' },
  disclaimer: { fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '5px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left', fontSize: '14px' },
  td: { borderBottom: '1px solid #ddd', padding: '10px', fontSize: '14px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, fontSize: '24px' }
};

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false); 

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      const acc = prompt("請輸入管理員帳號 (提示: 1234)：");
      const pwd = prompt("請輸入管理員密碼 (提示: 1234)：");
      
      if (acc === "1234" && pwd === "1234") {
        setIsAdmin(true);
      } else {
        alert("帳號或密碼錯誤，請輸入 1234。");
      }
    }
  };

  return (
    <div style={styles.app}>
      {loading && <div style={styles.overlay}>系統處理中...</div>}
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={{ margin: 0, color: '#333' }}>AI 智慧民宿系統</h1>
          <button style={styles.button} onClick={handleAdminToggle}>
            {isAdmin ? '登出後台' : '管理員登入'}
          </button>
        </div>
        {isAdmin ? <AdminDashboard db={db} setLoading={setLoading} /> : <CustomerView db={db} setLoading={setLoading} />}
      </div>
    </div>
  );
}

// ==========================================
// 3. 顧客端介面
// ==========================================
function CustomerView({ db, setLoading }) {
  const [form, setForm] = useState({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '', paymentMethod: '信用卡' });
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '您好！我是 AI 客服。請問想了解入住規定、退費政策還是周邊景點？' }]);
  const [chatInput, setChatInput] = useState('');
  const [paymentStep, setPaymentStep] = useState(false);
  
  // 查詢訂單用的狀態
  const [queryPhone, setQueryPhone] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);

  // 處理訂房
  const handleBookingInit = async (e) => {
    e.preventDefault();
    if (!form.dateIn || !form.dateOut || !form.name) return alert('資料不完整');
    if (form.dateIn >= form.dateOut) return alert('退房日期必須晚於入住日期');
    
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), where("roomType", "==", form.roomType), where("dateIn", "==", form.dateIn), where("status", "in", ["已付款", "待付款"]));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        alert('該房型已被預訂');
        setLoading(false);
        return;
      }
      setPaymentStep(true);
    } catch(err) {
      alert("資料庫連線失敗，請檢查 Firestore 規則是否設定為開放讀寫。");
    }
    setLoading(false);
  };

  const handleMockPayment = async (isSuccess) => {
    if (!isSuccess) {
      setPaymentStep(false);
      return alert('已取消付款');
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "bookings"), {
        ...form,
        status: '已付款', 
        timestamp: new Date().toISOString()
      });
      alert('付款成功！訂單已成立。');
      setForm({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '', paymentMethod: '信用卡' });
      setPaymentStep(false);
      setQueryResults([]); 
      setHasQueried(false);
    } catch (error) {
      alert('系統寫入錯誤，請確認 Firestore 規則。');
    }
    setLoading(false);
  };

  // 假的 AI 客服邏輯 (Mock API)
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newHistory);
    const currentInput = chatInput;
    setChatInput(''); 

    setTimeout(() => {
      let aiText = "這部分的問題我還在學習中，如果是急事，請直接聯繫民宿老闆喔！"; 
      if (currentInput.includes("退費") || currentInput.includes("取消") || currentInput.includes("退款")) {
        aiText = "我們的退費政策是：入住前 7 天取消可全額退費，3 天前取消退還 50%，當天取消則不予退費。";
      } 
      else if (currentInput.includes("景點") || currentInput.includes("附近") || currentInput.includes("玩")) {
        aiText = "民宿附近有著名的老街跟生態農場，騎車大約 10 分鐘就可以抵達，晚上還推薦去後山看夜景喔！";
      } 
      else if (currentInput.includes("規定") || currentInput.includes("入住") || currentInput.includes("時間")) {
        aiText = "入住時間為下午 15:00 後，退房為隔日上午 11:00 前。室內全面禁菸，且晚上 10 點後請降低音量避免打擾其他房客。";
      }
      else if (currentInput.includes("真人") || currentInput.includes("客訴") || currentInput.includes("老闆") || currentInput.includes("優惠")) {
        aiText = "目前最新的優惠是「暑期早鳥專案」，現在訂房結帳輸入代碼『SUMMER88』享 88 折！或點擊此連結加入官方 Line 領取更多優惠：https://line.me/ti/p/...";
      }
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
    }, 1000); 
  };

  const handleQueryOrder = async (e) => {
    e.preventDefault();
    if (!queryPhone.trim()) return alert('請輸入訂房時留下的聯絡電話');
    setLoading(true);
    setHasQueried(true);
    try {
      const q = query(collection(db, "bookings"), where("phone", "==", queryPhone));
      const snapshot = await getDocs(q);
      setQueryResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      alert("查詢失敗，請稍後再試。");
    }
    setLoading(false);
  };

  return (
    <div>
      {/* 新增：靜態優惠活動橫幅 */}
      <div style={styles.promoBox}>
        <h3 style={styles.promoTitle}>
          🎉 本月限定優惠活動 
          <span style={styles.promoTag}>HOT</span>
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li><strong>【暑期早鳥專案】</strong>提前 30 天預訂「家庭包棟」，結帳輸入代碼 <code style={{backgroundColor: '#fff', padding: '2px 4px', borderRadius: '4px'}}>SUMMER88</code> 享 88 折！</li>
          <li><strong>【壽星獨享】</strong>當月壽星入住「豪華四人房」，現場出示證件即贈送精美紅酒一瓶。</li>
          <li><strong>【AI 客服專屬禮】</strong>透過下方 AI 客服成功預約周邊行程，再享住宿費現折 500 元。</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ ...styles.card, flex: 1, minWidth: '300px', marginBottom: 0 }}>
          <h3>AI 智慧客服</h3>
          <div style={styles.chatBox}>
            {chatHistory.map((msg, i) => (
              <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}>{msg.text}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input style={styles.input} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="詢問退費、景點或優惠..." onKeyPress={e => e.key === 'Enter' && sendChatMessage()} />
            <button style={styles.button} onClick={sendChatMessage}>發送</button>
          </div>
          <div style={styles.disclaimer}>※ AI 助理回覆僅供參考，若遇消費糾紛請聯繫真人客服。</div>
        </div>

        <div style={{ ...styles.card, flex: 1, minWidth: '300px', marginBottom: 0 }}>
          <h3>線上訂房</h3>
          {!paymentStep ? (
            <form onSubmit={handleBookingInit}>
               <div style={styles.infoBox}>
                 <strong>🕒 住宿時間規範：</strong><br/>
                 入住時間：當日下午 15:00 後<br/>
                 退房時間：隔日上午 11:00 前
               </div>
               
               <div style={{ display: 'flex', gap: '10px' }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>入住日期</label>
                   <input type="date" style={styles.input} value={form.dateIn} onChange={e => setForm({...form, dateIn: e.target.value})} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>退房日期</label>
                   <input type="date" style={styles.input} value={form.dateOut} onChange={e => setForm({...form, dateOut: e.target.value})} required />
                 </div>
               </div>

               <label style={{ fontSize: '12px', color: '#666' }}>房型選擇</label>
               <select style={styles.input} value={form.roomType} onChange={e => setForm({...form, roomType: e.target.value})}>
                  <option value="標準雙人房">標準雙人房</option>
                  <option value="豪華四人房">豪華四人房</option>
                  <option value="家庭包棟">家庭包棟</option>
               </select>

               <label style={{ fontSize: '12px', color: '#666' }}>付款方式</label>
               <select style={styles.input} value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                  <option value="信用卡">信用卡 (支援 VISA / MasterCard)</option>
                  <option value="LINE Pay">LINE Pay</option>
                  <option value="ATM 轉帳">虛擬帳號 ATM 轉帳</option>
               </select>

               <div style={{ display: 'flex', gap: '10px' }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>訂購人姓名</label>
                   <input type="text" placeholder="例：王小明" style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: '12px', color: '#666' }}>聯絡電話 (查詢訂單用)</label>
                   <input type="text" placeholder="例：0912345678" style={styles.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
                 </div>
               </div>

               <button type="submit" style={{...styles.button, width: '100%', marginTop: '10px'}}>前往結帳</button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h4>即將跳轉 {form.paymentMethod} 金流閘道 (模擬)</h4>
              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '15px 0', textAlign: 'left' }}>
                <p><strong>訂單明細：</strong></p>
                <p>房型：{form.roomType}</p>
                <p>日期：{form.dateIn} 至 {form.dateOut}</p>
                <p>聯絡電話：{form.phone}</p>
                <p>付款方式：{form.paymentMethod}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button style={{...styles.button, backgroundColor: '#28a745'}} onClick={() => handleMockPayment(true)}>模擬付款成功</button>
                <button style={{...styles.button, ...styles.buttonDanger}} onClick={() => handleMockPayment(false)}>取消返回</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 訂單查詢區塊 */}
      <div style={styles.card}>
        <h3>訂單查詢系統</h3>
        <form onSubmit={handleQueryOrder} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="請輸入訂房時留下的聯絡電話" 
            style={{ ...styles.input, margin: 0, flex: 1 }} 
            value={queryPhone} 
            onChange={e => setQueryPhone(e.target.value)} 
          />
          <button type="submit" style={styles.button}>查詢我的訂單</button>
        </form>

        {hasQueried && queryResults.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>查無此電話的訂房紀錄。</div>
        )}

        {queryResults.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>入住 / 退房日期</th>
                  <th style={styles.th}>預訂房型</th>
                  <th style={styles.th}>訂購人</th>
                  <th style={styles.th}>狀態</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map(o => (
                  <tr key={o.id}>
                    <td style={styles.td}>{o.dateIn} ~ {o.dateOut}</td>
                    <td style={styles.td}>{o.roomType}</td>
                    <td style={styles.td}>{o.name}</td>
                    <td style={styles.td}><strong style={{ color: o.status === '已付款' ? 'green' : 'orange' }}>{o.status}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. 管理者端介面
// ==========================================
function AdminDashboard({ db, setLoading }) {
  const [orders, setOrders] = useState([]);
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      alert("讀取失敗。若您變更了 Firestore 規則，請確認目前為開發模式。");
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const deleteOrder = async (id) => {
    if (window.confirm("確定刪除此訂單？")) {
      await deleteDoc(doc(db, "bookings", id));
      fetchOrders();
    }
  };

  return (
    <div style={styles.card}>
      <h3>訂單管理列表</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>日期區間</th>
              <th style={styles.th}>房型</th>
              <th style={styles.th}>客戶資訊</th>
              <th style={styles.th}>付款方式</th>
              <th style={styles.th}>狀態</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={styles.td}>{o.dateIn} ~ {o.dateOut}</td>
                <td style={styles.td}>{o.roomType}</td>
                <td style={styles.td}>{o.name}<br/><span style={{fontSize: '12px', color: '#666'}}>{o.phone}</span></td>
                <td style={styles.td}>{o.paymentMethod || '未紀錄'}</td>
                <td style={styles.td}><strong style={{ color: o.status === '已付款' ? 'green' : 'orange' }}>{o.status}</strong></td>
                <td style={styles.td}>
                  <button style={{...styles.button, ...styles.buttonDanger, padding: '4px 8px'}} onClick={() => deleteOrder(o.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
