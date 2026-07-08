import React from 'react';
import { Star, Send } from 'lucide-react';
import './ReviewModule.css';

const ReviewModule = () => {
    const [rating, setRating] = React.useState(0);
    const [hover, setHover] = React.useState(0);
    const [submitted, setSubmitted] = React.useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="module-content flex-center">
                <div className="card text-center" style={{ maxWidth: '500px', width: '100%', padding: '3rem' }}>
                    <div className="success-icon-large">🏆</div>
                    <h2 style={{ marginBottom: '1rem', marginTop: '1rem' }}>Thank You!</h2>
                    <p style={{ color: 'var(--text-muted)' }}>We genuinely appreciate your feedback and are thrilled to have collaborated with you on this project.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="module-content flex-center">
            <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2>Project Final Review</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Your project is now completed. Please rate your experience.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="star-rating-container">
                        {[...Array(5)].map((_, index) => {
                            const starValue = index + 1;
                            return (
                                <button
                                    type="button"
                                    key={starValue}
                                    className={`star-btn ${starValue <= (hover || rating) ? "on" : "off"}`}
                                    onClick={() => setRating(starValue)}
                                    onMouseEnter={() => setHover(starValue)}
                                    onMouseLeave={() => setHover(rating)}
                                >
                                    <Star size={48} fill={starValue <= (hover || rating) ? "currentColor" : "none"} />
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ marginBottom: '2rem', marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Share your feedback (Optional)</label>
                        <textarea 
                            className="input-field" 
                            rows="4" 
                            placeholder="What did you love about working with us? Any areas for improvement?"
                        ></textarea>
                    </div>

                    <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
                        disabled={rating === 0}
                    >
                        Submit Review <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReviewModule;
