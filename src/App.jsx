import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// ==========================================
// 1. 設定與初始化 (請填入你的金鑰)
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
const auth = getAuth(app);

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; 

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
  chatBox: { height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px', backgroundColor: '#fafafa' },
  bubbleUser: { backgroundColor: '#007bff', color: '#fff', padding: '10px', borderRadius: '15px', margin: '5px 0', alignSelf: 'flex-end', marginLeft: 'auto', width: 'fit-content', maxWidth: '80%' },
  bubbleAi: { backgroundColor: '#e9ecef', color: '#333', padding: '10px', borderRadius: '15px', margin: '5px 0', width: 'fit-content', maxWidth: '80%' },
  disclaimer: { fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '5px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' },
  td: { borderBottom: '1px solid #ddd', padding: '10px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, fontSize: '24px' }
};

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAdminToggle = () => {
    if (isAdmin) {
      signOut(auth);
    } else {
      const email = prompt("管理員帳號 (Email)：");
      const pwd = prompt("管理員密碼：");
      if (email && pwd) {
        setLoading(true);
        signInWithEmailAndPassword(auth, email, pwd)
          .catch(err => { alert("登入失敗：" + err.message); setLoading(false); });
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
  // 狀態新增 paymentMethod
  const [form, setForm] = useState({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '', paymentMethod: '信用卡' });
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '您好！我是 AI 客服。請問想了解入住規定、退費政策還是周邊景點？' }]);
  const [chatInput, setChatInput] = useState('');
  const [paymentStep, setPaymentStep] = useState(false);

  const handleBookingInit = async (e) => {
    e.preventDefault();
    if (!form.dateIn || !form.dateOut || !form.name) return alert('資料不完整');
    if (form.dateIn >= form.dateOut) return alert('退房日期必須晚於入住日期');
    
    setLoading(true);
    
    const q = query(collection(db, "bookings"), where("roomType", "==", form.roomType), where("dateIn", "==", form.dateIn), where("status", "in", ["已付款", "待付款"]));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      alert('該房型已被預訂');
      setLoading(false);
      return;
    }
    
    setPaymentStep(true);
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
    } catch (error) {
      alert('系統寫入錯誤');
    }
    setLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    if (chatInput.includes("真人") || chatInput.includes("客訴")) {
      setChatHistory(prev => [...prev, { role: 'user', text: chatInput }, { role: 'ai', text: '已為您轉接真人客服，請點擊此連結加入官方 Line：https://line.me/... 或撥打 0900-000-000' }]);
      setChatInput('');
      return;
    }

    const newHistory = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newHistory);
    const currentInput = chatInput;
    setChatInput('');

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: "你是台灣某民宿的專業 AI 客服。1. 語氣要有禮貌。2. 僅回答與住宿、房價、周邊景點相關的問題。3. 若使用者詢問政治、無關問題或要求折扣，必須禮貌拒絕並請對方聯繫真人客服。4. 入住時間為 15:00，退房時間為 11:00。" }]
          },
          contents: [{ parts: [{ text: currentInput }] }],
          generationConfig: { temperature: 0.2 } 
        })
      });
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，系統目前無法回應。";
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', text: '連線異常。' }]);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ ...styles.card, flex: 1, minWidth: '300px' }}>
        <h3>AI 智慧客服</h3>
        <div style={styles.chatBox}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}>{msg.text}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input style={styles.input} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} />
          <button style={styles.button} onClick={sendChatMessage}>發送</button>
        </div>
        <div style={styles.disclaimer}>※ AI 助理回覆僅供參考，若遇消費糾紛請聯繫真人客服。</div>
      </div>

      <div style={{ ...styles.card, flex: 1, minWidth: '300px' }}>
        <h3>線上訂房</h3>
        {!paymentStep ? (
          <form onSubmit={handleBookingInit}>
             {/* 明示入住與退房時間 */}
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

             {/* 新增付款方式選擇 */}
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
                 <label style={{ fontSize: '12px', color: '#666' }}>聯絡電話</label>
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
      alert("讀取失敗，請確認 Firebase 權限。");
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
      <h3>訂單管理列表 (授權存取)</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>日期區間</th>
            <th style={styles.th}>房型</th>
            <th style={styles.th}>客戶資訊</th>
            {/* 新增付款方式欄位 */}
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
  );
}
