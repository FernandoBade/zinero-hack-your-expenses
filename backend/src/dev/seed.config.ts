import { AccountType } from '../../../shared/enums/account.enums';
import { CategoryColor, CategoryType } from '../../../shared/enums/category.enums';
import { CreditCardFlag } from '../../../shared/enums/creditCard.enums';
import { Currency, Language, Profile, Theme } from '../../../shared/enums/user.enums';
import { Locale } from '../../../shared/i18n/types/locale';

export type AccountTemplate = {
    name: string;
    type: AccountType;
    observation?: string;
};

export type CreditCardProduct = {
    name: string;
    flag: CreditCardFlag;
    observation?: string;
};

export type CategoryTemplate = {
    name: string;
    type: CategoryType;
    color: CategoryColor;
    subcategories: string[];
    amountRange: { min: number; max: number };
    merchants: string[];
    observationTemplates: string[];
    recurringChance?: number;
    installmentChance?: number;
};

export type SeedConfig = {
    language: Locale;
    defaultPassword: string;
    emailDomain: string;
    userOptions: {
        themes: Theme[];
        languages: Language[];
        currencies: Currency[];
        profiles: Profile[];
        phoneChance: number;
        birthDateChance: number;
        activeChance: number;
        hideValuesChance: number;
    };
    accountsPerUser: { min: number; max: number };
    creditCardsPerUser: { min: number; max: number };
    creditCardLimitRange: { min: number; max: number };
    tagsPerUser: { min: number; max: number };
    transactionsPerUser: { min: number; max: number };
    transactionDistribution: {
        creditCardShare: { min: number; max: number };
        minCreditCardTransactions: number;
        incomeShare: { min: number; max: number };
        minIncomeTransactions: number;
        observationChance: number;
        subcategoryChance: number;
        tagChance: number;
        minTags: number;
        maxTags: number;
    };
    recurringDefaults: {
        chance: number;
        minDay: number;
        maxDay: number;
    };
    installmentDefaults: {
        chance: number;
        minMonths: number;
        maxMonths: number;
    };
    dateRangeYears: number;
    firstNames: string[];
    lastNames: string[];
    phoneAreaCodes: string[];
    institutions: string[];
    accountTemplates: AccountTemplate[];
    creditCardProducts: CreditCardProduct[];
    categories: CategoryTemplate[];
    tagNames: string[];
};

/**
 * Seed configuration and data templates used for development data generation.
 *
 * @summary Defines seed defaults, templates, and distributions for dev seeding.
 */
export const seedConfig: SeedConfig = {
    language: Language.PT_BR,
    defaultPassword: 'DevSeed123!',
    emailDomain: 'example.com',
    userOptions: {
        themes: [Theme.DARK, Theme.LIGHT],
        languages: [Language.EN_US, Language.PT_BR],
        currencies: [Currency.BRL, Currency.USD],
        profiles: [Profile.STARTER, Profile.PRO, Profile.MASTER],
        phoneChance: 0.75,
        birthDateChance: 0.85,
        activeChance: 0.98,
        hideValuesChance: 0.3,
    },
    accountsPerUser: { min: 1, max: 3 },
    creditCardsPerUser: { min: 0, max: 2 },
    creditCardLimitRange: { min: 800, max: 20000 },
    tagsPerUser: { min: 3, max: 8 },
    transactionsPerUser: { min: 10, max: 50 },
    transactionDistribution: {
        creditCardShare: { min: 0.2, max: 0.45 },
        minCreditCardTransactions: 15,
        incomeShare: { min: 0.15, max: 0.32 },
        minIncomeTransactions: 12,
        observationChance: 0.85,
        subcategoryChance: 0.7,
        tagChance: 0.6,
        minTags: 1,
        maxTags: 3,
    },
    recurringDefaults: {
        chance: 0.2,
        minDay: 1,
        maxDay: 28,
    },
    installmentDefaults: {
        chance: 0.15,
        minMonths: 2,
        maxMonths: 12,
    },
    dateRangeYears: 3,
    firstNames: [
        'Ana', 'Aline', 'Beatriz', 'Bruno', 'Caio', 'Carla', 'Claudio', 'Daniela', 'Diego', 'Eduardo', 'Elias', 'Fabiana', 'Fernanda', 'Gabriela', 'Gustavo', 'Helena', 'Henrique', 'Igor', 'Isabela', 'Joao',
        'Julia', 'Karla', 'Larissa', 'Lucas', 'Mariana', 'Mateus', 'Matheus', 'Nicolas', 'Natalia', 'Otavio', 'Olivia', 'Paula', 'Pedro', 'Rafael', 'Roberto', 'Sofia', 'Simone', 'Thiago', 'Vanessa', 'Victor',
        'Walter', 'Xavier', 'Yasmin', 'Zoe', 'Luan', 'Bianca', 'Camila', 'Mateo'
    ],
    lastNames: [
        'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Almeida', 'Gomes', 'Ribeiro',
        'Costa', 'Carvalho', 'Martins', 'Araujo', 'Barbosa', 'Rocha', 'Dias', 'Moura', 'Cardoso', 'Teixeira',
        'Nunes', 'Mendes', 'Pinto', 'Soares', 'Barros', 'Ramos', 'Neto', 'Castro', 'Farias', 'Monteiro',
        'Vieira', 'Mendonca', 'Freitas', 'Santos Filho'
    ],
    phoneAreaCodes: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '31', '32', '41', '42', '51', '61', '71', '81', '91', '92'],
    institutions: [
        'Nubank', 'Itau', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa', 'Inter', 'C6 Bank', 'Neon', 'Original', 'Next', 'PagBank', 'HSBC', 'Banco Mercantil', 'Agibank', 'N26', 'Banco Pan'
    ],
    accountTemplates: [
        { name: 'Conta Principal', type: AccountType.CHECKING, observation: 'Conta principal para uso diário.' },
        { name: 'Cuenta Nómina', type: AccountType.PAYROLL, observation: 'Depósitos de nómina / Salary deposits.' },
        { name: 'Savings Account', type: AccountType.SAVINGS, observation: 'Reservas / Ahorros / Poupança.' },
        { name: 'Fundo de Emergência', type: AccountType.SAVINGS, observation: 'Reserva para emergências.' },
        { name: 'Cuenta de Viaje', type: AccountType.SAVINGS, observation: 'Ahorros para viajes / Trips and vacations.' },
        { name: 'Conta de Investimento', type: AccountType.INVESTMENT, observation: 'Investimentos de longo prazo.' },
        { name: 'Crypto Wallet', type: AccountType.INVESTMENT, observation: 'Cripto / Crypto holdings.' },
        { name: 'Linha de Crédito', type: AccountType.LOAN, observation: 'Crédito pessoal / Línea de crédito.' },
        { name: 'Contas a Pagar', type: AccountType.CHECKING, observation: 'Despesas mensais / Monthly expenses.' },
        { name: 'Cuenta Empresarial', type: AccountType.CHECKING, observation: 'Transações comerciais / Business transactions.' },
    ],
    creditCardProducts: [
        { name: 'Nubank Platinum', flag: CreditCardFlag.MASTERCARD, observation: 'Primary credit card.' },
        { name: 'Itau Gold', flag: CreditCardFlag.VISA, observation: 'Secondary credit card.' },
        { name: 'Santander Free', flag: CreditCardFlag.VISA, observation: 'No annual fee card.' },
        { name: 'Bradesco Elo Mais', flag: CreditCardFlag.ELO, observation: 'Rewards card.' },
        { name: 'Inter Mastercard', flag: CreditCardFlag.MASTERCARD, observation: 'Online purchases.' },
        { name: 'C6 Carbon', flag: CreditCardFlag.MASTERCARD, observation: 'Travel perks.' },
        { name: 'Ourocard Internacional', flag: CreditCardFlag.VISA, observation: 'Everyday use.' },
        { name: 'Amex Green', flag: CreditCardFlag.AMEX, observation: 'Premium benefits.' },
        { name: 'Santander Ultimate', flag: CreditCardFlag.VISA, observation: 'High-tier rewards.' },
        { name: 'Itaú Platinum', flag: CreditCardFlag.MASTERCARD, observation: 'Exclusive benefits.' },
        { name: 'PagBank Elo', flag: CreditCardFlag.ELO, observation: 'Digital bank card.' },
        { name: 'Hipercard Standard', flag: CreditCardFlag.HIPERCARD, observation: 'Brazilian network card.' },
        { name: 'Diners Club', flag: CreditCardFlag.DINERS, observation: 'Lounge and travel perks.' },
        { name: 'Discover Cashback', flag: CreditCardFlag.DISCOVER, observation: 'Cashback rewards.' },
    ],
    tagNames: [
        'Essentials',
        'Family',
        'Travel',
        'Subscriptions',
        'Work',
        'Health',
        'Education',
        'Gifts',
        'Urgent',
        'Savings',
        'Lifestyle',
        'Home',
        'Entertainment',
        'Auto',
        'Food',
    ],
    categories: [
        {
            name: 'Salary',
            type: CategoryType.INCOME,
            color: CategoryColor.GREEN,
            subcategories: ['Monthly Salary', 'Bonus', 'Overtime', 'Commission', 'Allowance'],
            amountRange: { min: 2500, max: 18000 },
            merchants: ['Folha de Pagamento', 'Payroll', 'Empresa', 'Employer', 'Departamento de RH', 'HR Department', 'Equipe Financeira', 'Finance Team'],
            observationTemplates: [
                'Payroll from {merchant}',
                '{merchant} salary deposit',
                'Monthly salary - {merchant}',
                'Bonus payout - {merchant}'
            ],
            recurringChance: 0.9,
        },
        {
            name: 'Freelance',
            type: CategoryType.INCOME,
            color: CategoryColor.CYAN,
            subcategories: ['Consulting', 'Design', 'Development', 'Writing', 'Support'],
            amountRange: { min: 300, max: 9000 },
            merchants: ['Projeto Cliente', 'Client Project', 'Trabajo por contrato', 'Contract Work', 'Side Gig', 'Freelance Client', 'Cliente Freelance'],
            observationTemplates: [
                'Freelance payment - {merchant}',
                '{merchant} invoice',
                'Project payout - {merchant}',
                'Contract income - {merchant}'
            ],
            recurringChance: 0.25,
        },
        {
            name: 'Investments',
            type: CategoryType.INCOME,
            color: CategoryColor.BLUE,
            subcategories: ['Dividends', 'Interest', 'Capital Gains', 'Savings Yield', 'Crypto'],
            amountRange: { min: 50, max: 3500 },
            merchants: ['Corretora', 'Brokerage', 'Poupança', 'Savings', 'Plataforma de Investimentos', 'Investment Platform', 'Dividend', 'Dividendos'],
            observationTemplates: [
                'Investment income - {merchant}',
                '{merchant} yield',
                'Dividend credit - {merchant}',
                'Capital gains - {merchant}'
            ],
            recurringChance: 0.4,
        },
        {
            name: 'Refunds',
            type: CategoryType.INCOME,
            color: CategoryColor.GREEN,
            subcategories: ['Product Return', 'Service Refund'],
            amountRange: { min: 5, max: 1500 },
            merchants: ['Loja', 'Store', 'Tienda', 'Marketplace', 'Vendedor', 'Seller'],
            observationTemplates: ['Refund - {merchant}', '{merchant} return'],
            recurringChance: 0.02,
        },
        {
            name: 'Gifts',
            type: CategoryType.INCOME,
            color: CategoryColor.CYAN,
            subcategories: ['Birthday', 'Anniversary', 'Other Gifts'],
            amountRange: { min: 10, max: 2000 },
            merchants: ['Amigo', 'Friend', 'Familia', 'Family'],
            observationTemplates: ['Gift from {merchant}', '{merchant} present'],
            recurringChance: 0.01,
        },
        {
            name: 'Housing',
            type: CategoryType.EXPENSE,
            color: CategoryColor.RED,
            subcategories: ['Rent', 'Mortgage', 'Condo Fees', 'Maintenance', 'Insurance'],
            amountRange: { min: 400, max: 5500 },
            merchants: ['Síndico', 'Property Manager', 'Condomínio', 'Condo Office', 'Serviços de Habitação', 'Housing Services'],
            observationTemplates: [
                '{merchant} - housing payment',
                'Monthly housing - {merchant}',
                'Property expense - {merchant}'
            ],
            recurringChance: 0.85,
        },
        {
            name: 'Utilities',
            type: CategoryType.EXPENSE,
            color: CategoryColor.YELLOW,
            subcategories: ['Electricity', 'Water', 'Internet', 'Mobile', 'Gas'],
            amountRange: { min: 40, max: 450 },
            merchants: ['Fornecedor de Serviços', 'Utility Provider', 'Telecom', 'Proveedor de Telecom', 'Serviço de Internet', 'Internet Service'],
            observationTemplates: [
                'Utility bill - {merchant}',
                '{merchant} invoice',
                'Monthly utilities - {merchant}'
            ],
            recurringChance: 0.8,
        },
        {
            name: 'Groceries',
            type: CategoryType.EXPENSE,
            color: CategoryColor.ORANGE,
            subcategories: ['Supermarket', 'Bakery', 'Butcher', 'Convenience', 'Farmers Market', 'Online Groceries'],
            amountRange: { min: 20, max: 650 },
            merchants: ['Carrefour', 'Pao de Acucar', 'Assai', 'Mercado Local', 'Local Market', 'Extra', 'Mercado Livre', 'Supermercado'],
            observationTemplates: [
                'Groceries - {merchant}',
                '{merchant} purchase',
                'Food supplies - {merchant}'
            ],
            recurringChance: 0.3,
        },
        {
            name: 'Transport',
            type: CategoryType.EXPENSE,
            color: CategoryColor.GRAY,
            subcategories: ['Fuel', 'Ride Share', 'Public Transit', 'Parking', 'Toll', 'Taxi'],
            amountRange: { min: 8, max: 380 },
            merchants: ['Uber', '99', 'Shell', 'Petrobras', 'Metro', 'Táxi', 'Taxi', 'Transporte Público'],
            observationTemplates: [
                'Transport - {merchant}',
                '{merchant} ride',
                'Commute expense - {merchant}'
            ],
            recurringChance: 0.05,
        },
        {
            name: 'Dining',
            type: CategoryType.EXPENSE,
            color: CategoryColor.PINK,
            subcategories: ['Restaurant', 'Fast Food', 'Coffee', 'Delivery', 'Bar'],
            amountRange: { min: 12, max: 420 },
            merchants: ['iFood', 'iFood (Delivery)', 'Burger King', 'Starbucks', 'Local Cafe', 'Cafetería', 'Restaurante Local', 'Outback'],
            observationTemplates: [
                'Dining - {merchant}',
                '{merchant} meal',
                'Food and drinks - {merchant}'
            ],
            recurringChance: 0.1,
        },
        {
            name: 'Shopping',
            type: CategoryType.EXPENSE,
            color: CategoryColor.PURPLE,
            subcategories: ['Clothing', 'Electronics', 'Home Goods', 'Pharmacy', 'Gifts'],
            amountRange: { min: 25, max: 2200 },
            merchants: ['Amazon', 'Mercado Livre', 'Renner', 'Magazine Luiza', 'Farmacia', 'Farmacia (Pharmacy)', 'Tienda'],
            observationTemplates: [
                'Shopping - {merchant}',
                '{merchant} purchase',
                'Retail expense - {merchant}'
            ],
            recurringChance: 0.08,
            installmentChance: 0.35,
        },
        {
            name: 'Health',
            type: CategoryType.EXPENSE,
            color: CategoryColor.RED,
            subcategories: ['Doctor', 'Pharmacy', 'Dentist', 'Therapy', 'Exams'],
            amountRange: { min: 30, max: 2500 },
            merchants: ['Hospital', 'Clínica', 'Clinica', 'DrogaRaia', 'Drogasil', 'Local Clinic', 'Farmácia'],
            observationTemplates: [
                'Health expense - {merchant}',
                '{merchant} payment',
                'Medical service - {merchant}'
            ],
            recurringChance: 0.05,
        },
        {
            name: 'Education',
            type: CategoryType.EXPENSE,
            color: CategoryColor.BLUE,
            subcategories: ['Tuition', 'Books', 'Courses', 'Workshops', 'Online Course'],
            amountRange: { min: 50, max: 7000 },
            merchants: ['Coursera', 'Udemy', 'University', 'Universidad', 'School', 'Escola', 'Bookstore', 'Livraria'],
            observationTemplates: [
                'Education - {merchant}',
                '{merchant} fee',
                'Course payment - {merchant}'
            ],
            recurringChance: 0.1,
        },
        {
            name: 'Travel',
            type: CategoryType.EXPENSE,
            color: CategoryColor.CYAN,
            subcategories: ['Flight', 'Hotel', 'Transportation', 'Tour', 'Visa'],
            amountRange: { min: 100, max: 8000 },
            merchants: ['Airline', 'Aerolinea', 'Booking', 'Reserva (Booking)', 'Hotel', 'Hotel (Hotel)', 'Agência de Viagens', 'Travel Agency'],
            observationTemplates: [
                'Travel - {merchant}',
                '{merchant} reservation',
                'Trip expense - {merchant}'
            ],
            recurringChance: 0.02,
        },
        {
            name: 'Insurance',
            type: CategoryType.EXPENSE,
            color: CategoryColor.GRAY,
            subcategories: ['Car Insurance', 'Home Insurance', 'Health Insurance', 'Life Insurance'],
            amountRange: { min: 30, max: 1200 },
            merchants: ['Seguradora', 'Insurance Co', 'Corretora', 'Broker'],
            observationTemplates: [
                'Insurance - {merchant}',
                'Premium payment - {merchant}'
            ],
            recurringChance: 0.7,
        },
        {
            name: 'Pets',
            type: CategoryType.EXPENSE,
            color: CategoryColor.PINK,
            subcategories: ['Vet', 'Food', 'Grooming', 'Accessories'],
            amountRange: { min: 15, max: 400 },
            merchants: ['Pet Shop', 'Loja Pet', 'Veterinário', 'Veterinary', 'Petcare'],
            observationTemplates: [
                'Pet expense - {merchant}',
                '{merchant} purchase'
            ],
            recurringChance: 0.05,
        },
        {
            name: 'Subscriptions',
            type: CategoryType.EXPENSE,
            color: CategoryColor.INDIGO,
            subcategories: ['Streaming', 'Software', 'Gym', 'News', 'Cloud Storage'],
            amountRange: { min: 5, max: 60 },
            merchants: ['Netflix', 'Spotify', 'Adobe', 'Gym', 'Apple', 'Plataforma', 'Serviço de Assinatura'],
            observationTemplates: [
                'Subscription - {merchant}',
                'Monthly subscription - {merchant}'
            ],
            recurringChance: 0.9,
        },
        {
            name: 'Taxes',
            type: CategoryType.EXPENSE,
            color: CategoryColor.RED,
            subcategories: ['Income Tax', 'Property Tax', 'Sales Tax', 'Other Taxes'],
            amountRange: { min: 10, max: 15000 },
            merchants: ['Tax Authority', 'Receita Federal', 'Hacienda', 'Autoridad Fiscal'],
            observationTemplates: [
                'Tax payment - {merchant}',
                'Tax - {merchant}'
            ],
            recurringChance: 0.2,
        },
        {
            name: 'Personal Care',
            type: CategoryType.EXPENSE,
            color: CategoryColor.PURPLE,
            subcategories: ['Haircut', 'Salon', 'Cosmetics', 'Spa'],
            amountRange: { min: 20, max: 300 },
            merchants: ['Salão', 'Salon', 'Spa', 'Loja de Beleza', 'Beauty Store'],
            observationTemplates: [
                'Personal care - {merchant}',
                '{merchant} service'
            ],
            recurringChance: 0.05,
        },
        {
            name: 'Entertainment',
            type: CategoryType.EXPENSE,
            color: CategoryColor.INDIGO,
            subcategories: ['Streaming', 'Movies', 'Games', 'Books', 'Events'],
            amountRange: { min: 10, max: 320 },
            merchants: ['Netflix', 'Spotify', 'Steam', 'Cinemark', 'Ticketmaster', 'Teatro', 'Cinema', 'Plataforma'],
            observationTemplates: [
                'Entertainment - {merchant}',
                '{merchant} subscription',
                'Leisure expense - {merchant}'
            ],
            recurringChance: 0.55,
        },
    ],
};
