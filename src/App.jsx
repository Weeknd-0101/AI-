import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

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
const auth = getAuth(app);

// 警告：正式環境中，API Key 必須放在 Node.js 後端，不可寫死在前端
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; 
const TOTAL_ROOMS = 10; 

// ==========================================
// 2. 樣式定義 (保持簡潔)
// ==========================================
const styles = {
  app: { fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  button: { padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0056b3', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  buttonDanger: { backgroundColor: '#dc3545' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px' },
  input: { width: '100%', padding: '10px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' },
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

  // 監聽 Firebase 登入狀態
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
// 3. 顧客端介面 (含 AI 風險控管與模擬金流)
// ==========================================
function CustomerView({ db, setLoading }) {
  const [form, setForm] = useState({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '' });
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '您好！我是 AI 客服。請問想了解入住規定、退費政策還是周邊景點？' }]);
  const [chatInput, setChatInput] = useState('');
  const [paymentStep, setPaymentStep] = useState(false);

  // 1. 訂房與金流模擬邏輯
  const handleBookingInit = async (e) => {
    e.preventDefault();
    if (!form.dateIn || !form.dateOut || !form.name) return alert('資料不完整');
    setLoading(true);
    
    // 查詢空房 (前端弱驗證，正式應交由後端 Transaction)
    const q = query(collection(db, "bookings"), where("roomType", "==", form.roomType), where("dateIn", "==", form.dateIn), where("status", "in", ["已付款", "待付款"]));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      alert('該房型已被預訂');
      setLoading(false);
      return;
    }
    
    // 進入模擬付款環節
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
        status: '已付款', // 模擬綠界/LINE Pay Webhook 回傳成功後寫入
        timestamp: new Date().toISOString()
      });
      alert('付款成功！訂單已成立。');
      setForm({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '' });
      setPaymentStep(false);
    } catch (error) {
      alert('系統寫入錯誤');
    }
    setLoading(false);
  };

  // 2. AI 智慧客服邏輯 (導入邊界限制)
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    // 觸發人工接管機制
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
          // 導入系統級別人設與限制
          system_instruction: {
            parts: [{ text: "你是台灣某民宿的專業 AI 客服。1. 語氣要有禮貌。2. 僅回答與住宿、房價、周邊景點相關的問題。3. 若使用者詢問政治、無關問題或要求折扣，必須禮貌拒絕並請對方聯繫真人客服。4. 不要隨便捏造價格，若不確定請回答「具體價格需視日期而定，請透過訂房系統查詢」。" }]
          },
          contents: [{ parts: [{ text: currentInput }] }],
          generationConfig: { temperature: 0.2 } // 降低隨機性防幻覺
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
             <input type="date" style={styles.input} value={form.dateIn} onChange={e => setForm({...form, dateIn: e.target.value})} required />
             <input type="date" style={styles.input} value={form.dateOut} onChange={e => setForm({...form, dateOut: e.target.value})} required />
             <select style={styles.input} value={form.roomType} onChange={e => setForm({...form, roomType: e.target.value})}>
                <option value="標準雙人房">標準雙人房</option>
                <option value="豪華四人房">豪華四人房</option>
             </select>
             <input type="text" placeholder="姓名" style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
             <input type="text" placeholder="電話" style={styles.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
             <button type="submit" style={{...styles.button, width: '100%'}}>前往結帳</button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <h4>即將跳轉第三方金流 (模擬)</h4>
            <p>訂單：{form.roomType} | {form.dateIn} 入住</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button style={{...styles.button, backgroundColor: '#28a745'}} onClick={() => handleMockPayment(true)}>模擬付款成功</button>
              <button style={{...styles.button, ...styles.buttonDanger}} onClick={() => handleMockPayment(false)}>取消</button>
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
            <th style={styles.th}>金流狀態</th>
            <th style={styles.th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td style={styles.td}>{o.dateIn} ~ {o.dateOut}</td>
              <td style={styles.td}>{o.roomType}</td>
              <td style={styles.td}>{o.name} ({o.phone})</td>
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
