import React from 'react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <h3>ethereal</h3>
          <p>Безопасная платформа для заметок с историей версий и контролем доступа.</p>
        </div>
        <div className={styles.links}>
          <div className={styles.column}>
            <h4>Проект</h4>
            <a href="#">Возможности</a>
            <a href="#">Тарифы</a>
            <a href="#">Документация</a>
          </div>
          <div className={styles.column}>
            <h4>Поддержка</h4>
            <a href="#">FAQ</a>
            <a href="#">Контакты</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </div>
      <div className={styles.copyright}>
        © {new Date().getFullYear()} Ethereal Notes. Дипломный проект.
      </div>
    </footer>
  )
}
