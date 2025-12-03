import React from 'react';
import { Link } from 'react-router-dom';
import { type Feature } from './featuresData';
import styles from './FeatureCard.module.css';

interface Props {
  feature: Feature;
}

const FeatureCard: React.FC<Props> = ({ feature }) => {
  return (
    <Link to={feature.link} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.iconWrapper} style={{ backgroundColor: feature.bgColor }}>
          <span className={styles.icon}>{feature.icon}</span>
        </div>
        <h3 className={styles.title}>{feature.title}</h3>
        <p className={styles.description}>{feature.description}</p>
      </div>
    </Link>
  );
};

export default FeatureCard;