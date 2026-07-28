import propTypes from "prop-types"
import{Label} from "../atoms"

export default function FAQItem({question,answer}) {
    return
    (
        <div className="border-b border-Grey/20 dark:border-DarkGrey/20 pb-3">
            <Label size="sm">{question}</Label>
            <p className ="text-sm text-OffBlack dark:text-Grey mt-1">{answer}</p>
        </div>
    )

}

FAQItem.propTypes = {
    question: PropTypes.string,isRequired,
    answer: PropTypes.string.isRequired,
}

