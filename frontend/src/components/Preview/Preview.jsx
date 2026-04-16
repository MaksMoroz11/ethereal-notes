import React from 'react'
import styles from './Preview.module.css'

export default function Preview() {
    return (
        <section className={styles.preview}>
            <div className={styles.container}>
                <div className={styles.previewBox}>
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarItem}></div>
                        <div className={styles.sidebarItem}></div>
                        <div className={`${styles.sidebarItem} ${styles.active}`}></div>
                    </div>
                    <div className={styles.mainArea}>
                        <div className={styles.headerRow}>
                        <div className={styles.headerTitle}></div>
                        <div className={styles.headerActions}></div>
                        </div>
                        <div className={styles.kanbanColumns}>
                        <div className={styles.column}>
                            <div className={styles.cardItem}></div>
                            <div className={styles.cardItem}></div>
                        </div>
                        <div className={styles.column}>
                            <div className={styles.cardItem}></div>
                        </div>
                        <div className={styles.column}>
                            <div className={styles.cardItem}></div>
                            <div className={styles.cardItem}></div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}