import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>
                    Управляйте знаниями команды <br />
                    <span className={styles.highlight}>без хаоса</span>
                </h1>
                <p className={styles.subtitle}>
                    Ethereal Notes — это безопасная платформа для заметок с автоматической 
                    историей версий и гибкими правами доступа. Забудьте о потерянных файлах.
                </p>
                <div className={styles.actions}>
                    <button className={styles.primaryButton}>
                        Начать бесплатно
                    </button>
                    <button className={styles.secondaryButton}>
                        Узнать больше
                    </button>
                </div>
            </div>
            
            <div className={styles.visual}>
                <div className={styles.placeholderImage}>
                    <span>Интерфейс приложения</span>
                </div>
            </div>
        </div>
        </section>
    );
};
